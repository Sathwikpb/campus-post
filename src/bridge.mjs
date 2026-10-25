import {createLiveView} from './live-view.mjs';
(() => {
  if(globalThis.campusPostBridgeLoaded)return;globalThis.campusPostBridgeLoaded=true;
  // Parse data literals only. Roundcube's returned JavaScript is never executed.
  function argsAt(text,at){let depth=1,quoted=false,escape=false;for(let i=at;i<text.length;i++){const c=text[i];if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}else if(c==='"')quoted=true;else if(c==='(')depth++;else if(c===')'&&!--depth)return JSON.parse('['+text.slice(at,i)+']');}throw Error('Unrecognized webmail response.');}
  function config(doc=document){const env={};for(const script of doc.scripts){const text=script.textContent||'';let start=0;while((start=text.indexOf('rcmail.set_env(',start))>=0){start+='rcmail.set_env('.length;try{Object.assign(env,argsAt(text,start)[0]);}catch{} }}return env;}
  let consent=null;
  // Cached because the popup follows the open email several times a second;
  // any consent change or full reset invalidates it through storage events.
  const storageEvents=chrome.storage.onChanged;storageEvents?.addListener((changes,area)=>{if(area==='local'&&'privacyConsent' in changes)consent=null;});
  async function consented(){if(consent!==null)return consent;const value=(await chrome.storage.local.get('privacyConsent')).privacyConsent?.version===1;if(storageEvents)consent=value;return value;}
  let cachedIdentity='';
  function context(){const env=config();if(document.querySelector('input[type=password]')||env.task==='login'){cachedIdentity='';throw Error('Sign into TU webmail first, then refresh the webmail tab.');}
    let identity=env.username||'';
    if(!identity){const label=document.querySelector('.header-title.username, #topline .username, #taskbar .username');const value=label?.textContent?.trim()||'';identity=value.match(/[A-Z0-9._%+-]+@tu-ilmenau\.de/i)?.[0]||(/^[a-z]{2,8}\d{4}$/i.test(value)?value:'');}
    if(identity)cachedIdentity=String(identity).trim().toLowerCase();
    if(!cachedIdentity)throw Error('Open one email in TU webmail so the account can be identified, then connect again.');
    return {account:cachedIdentity,folder:String(env.mailbox||'INBOX'),token:env.request_token||'',base:new URL('.',location.href).href};}
  function safeContext(expected){const c=context();if(expected&&expected!==c.account)throw Error('The signed-in mailbox changed. Reconnect before continuing.');return c;}
  async function request(parameters,expected){const c=safeContext(expected),url=new URL(c.base);url.search=new URLSearchParams({_task:'mail',...parameters});const response=await fetch(url,{credentials:'same-origin',redirect:'error',headers:{'X-Roundcube-Request':c.token},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Webmail request failed ('+response.status+'). Your session may have expired.');return response;}
  function decode(s){const area=document.createElement('textarea');area.innerHTML=s||'';return area.value;}
  async function list(page,account){
    if(!Number.isInteger(page)||page<1||page>10000)throw Error('Invalid inbox page.');
    const response=await request({_action:'list',_mbox:'INBOX',_page:String(page),_remote:'1'},account);
    const raw=await response.text();if(raw.length>8_000_000)throw Error('Webmail response too large.');let data;try{data=JSON.parse(raw);}catch{throw Error('Webmail returned a login page or unsupported response. Sign in again.');}
    if(data.action!=='list'||!data.env||!Number.isFinite(Number(data.env.messagecount)))throw Error('Unsupported inbox response.');
    const rows=[],code=data.exec||'';let at=0;
    while((at=code.indexOf('this.add_message_row(',at))>=0){at+='this.add_message_row('.length;const [uid,columns,flags]=argsAt(code,at);if(!/^\d+$/.test(String(uid)))continue;rows.push({uid:String(uid),subject:decode(columns?.subject),sender:decode(columns?.from||columns?.fromto),date:decode(columns?.date),unread:!flags?.seen});}
    safeContext(account);return {rows,total:Number(data.env.messagecount),pages:Math.max(1,Number(data.env.pagecount)||1),threaded:!!data.env.threading};
  }
  async function rawMail(uid,account,folder='INBOX'){
    if(!/^\d+$/.test(String(uid)))throw Error('Invalid message ID.');
    if(typeof folder!=='string'||folder.length>1000||/[\r\n\0]/.test(folder))throw Error('Invalid folder.');
    const response=await request({_action:'viewsource',_mbox:folder,_uid:String(uid)},account);
    if(Number(response.headers.get('content-length'))>6_000_000)throw Error('Message exceeds the 6 MB scan limit.');
    const stream=response.body.getReader(),parts=[];let size=0;
    while(true){const {done,value}=await stream.read();if(done)break;size+=value.length;if(size>6_000_000){await stream.cancel();throw Error('Message exceeds the 6 MB scan limit.');}parts.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
    const prefix=new TextDecoder().decode(bytes.slice(0,400));if(!/^(?:[A-Za-z][\w-]*:[^\r\n]*\r?\n)/.test(prefix)||/<!doctype|<html/i.test(prefix.slice(0,50)))throw Error('Webmail returned no email source. Your session may have expired.');
    let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));safeContext(account);return {raw:btoa(binary)};
  }
  let snapshotId='',nodes=[],history=new Map();
  function docs(){const all=[document];for(let i=0;i<all.length&&i<12;i++){for(const f of all[i].querySelectorAll('iframe'))try{if(f.contentDocument&&!all.includes(f.contentDocument))all.push(f.contentDocument);}catch{}}return all;}
  function snapshot(){
    safeContext();snapshotId=crypto.randomUUID();nodes=[];let total=0;
    for(const doc of docs()){
      const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const n=walker.currentNode,p=n.parentElement;
        if(!p||p.closest('script,style,noscript,textarea,input,select,option,[contenteditable],#campus-post-open,[hidden]')||!p.getClientRects().length||getComputedStyle(p).visibility==='hidden')continue;
        const text=history.get(n)?.original??n.data;if(!text.trim())continue;total++;
        if(nodes.length<5000&&text.length<=12000)nodes.push({node:n,original:text});
      }
    }
    return {id:snapshotId,texts:nodes.map(x=>x.original),total,limited:total>nodes.length};
  }
  function apply(id,values){
    if(id!==snapshotId||!Array.isArray(values)||values.length!==nodes.length)throw Error('The page changed; start page translation again.');let applied=0;
    for(let i=0;i<nodes.length;i++){const {node,original}=nodes[i],previous=history.get(node);if(typeof values[i]!=='string'||!node.isConnected||![original,previous?.last].includes(node.data))continue;node.data=values[i];history.set(node,{original,last:values[i]});applied++;}return {applied};
  }
  function restore(){let restored=0;for(const [n,h]of history){if(n.isConnected&&n.data===h.last){n.data=h.original;restored++;}}history.clear();nodes=[];snapshotId='';return {restored};}
  chrome.runtime.onMessage.addListener((message,sender,respond)=>{
    if(message.type==='campus-popup-toggle'&&sender.id===chrome.runtime.id&&!sender.tab){togglePopup(undefined,message.tabId).then(()=>respond({ok:true}),()=>respond({ok:false}));return true;}
    if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL('dashboard.html')))return;
    const handlers={context:()=>{const c=context();let openRef=null;for(const doc of docs()){const e=config(doc);if(e.uid)openRef={uid:String(e.uid),folder:String(e.mailbox||c.folder)};}return {account:c.account,folder:c.folder,open:CampusPostReader.read(),openRef};},list:()=>list(message.page,message.account),raw:()=>rawMail(message.uid,message.account,message.folder),snapshot:()=>{safeContext(message.account);return snapshot();},apply:()=>{safeContext(message.account);return apply(message.id,message.values);},restore:()=>restore()};
    if(!handlers[message.type])return;
    Promise.resolve().then(async()=>{if(!await consented())throw Error('Enable email tools in Campus Post before accessing webmail.');return handlers[message.type]();}).then(data=>respond({ok:true,...data}),error=>respond({ok:false,error:error.message}));return true;
  });
  const host=document.createElement('div');host.id='campus-post-open';host.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000';
  const shadow=host.attachShadow({mode:'open'}),button=document.createElement('button');button.textContent='✉ Campus Post';button.style.cssText='font:600 14px system-ui;padding:13px 19px;border:0;border-radius:24px;background:#235e48;color:white;box-shadow:0 4px 20px #0003;cursor:pointer';button.setAttribute('aria-expanded','false');
  const panel=document.createElement('section');panel.hidden=true;panel.setAttribute('aria-label','Campus Post email assistant');panel.style.cssText='width:min(460px,calc(100vw - 36px));height:min(760px,calc(100vh - 100px));margin-bottom:10px;background:#fafcf7;border:1px solid #d7e1d7;border-radius:16px;box-shadow:0 8px 45px #0003;overflow:hidden;display:flex;flex-direction:column';
  // An extension-origin frame keeps mailbox text and browser models isolated
  // from the webmail page, while presenting the assistant as an in-page popup.
  const top=document.createElement('div');top.style.cssText='display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#183f35;color:white;font:700 16px system-ui';
  const title=document.createElement('span');title.textContent='Campus Post ↗';const close=document.createElement('button');close.textContent='×';close.setAttribute('aria-label','Close Campus Post');close.style.cssText='font:18px system-ui;border:1px solid #ffffff55;border-radius:7px;background:transparent;color:white;padding:2px 8px;cursor:pointer';top.append(title,close);panel.append(top);
  let frame,currentTabId=0;
  const live=createLiveView({shadow,panel,read:()=>CampusPostReader.read(),openFull:()=>window.open(chrome.runtime.getURL('dashboard.html')+'?tab='+currentTabId,'_blank','noopener')});
  window.addEventListener('message',event=>{const url=new URL(chrome.runtime.getURL(''));const allowed=url.origin==='null'?url.protocol+'//'+url.host:url.origin;if(event.source!==frame?.contentWindow||event.origin!==allowed)return;if(event.data?.type==='campus-ready'){live.setAdvanced(true);frame.style.display='block';}else if(event.data?.type==='campus-fallback'){live.setAdvanced(false);frame.style.display='none';}});

  async function togglePopup(force,knownTabId,remember=true){
    const visible=force??panel.hidden;
    if(visible&&!frame){
      const data=knownTabId?{ok:true,tabId:knownTabId}:await chrome.runtime.sendMessage({type:'campus-context'});
      if(!data?.ok||!data.tabId)return;
      currentTabId=data.tabId;frame=document.createElement('iframe');frame.title='Campus Post assistant';frame.src=chrome.runtime.getURL('dashboard.html')+'?tab='+data.tabId+'&popup=1';frame.allow='translator; summarizer; language-detector';frame.style.cssText='display:none;width:100%;flex:1;min-height:0;border:0;background:#fafcf7';frame.addEventListener('load',()=>frame.contentWindow?.postMessage({type:'campus-visibility',visible:!panel.hidden},'*'));panel.append(frame);new MutationObserver(()=>{if(frame.hasAttribute('srcdoc')){frame.style.display='none';live.setAdvanced(false);}}).observe(frame,{attributes:true,attributeFilter:['srcdoc']});
    }
    panel.hidden=!visible;panel.style.display=visible?'flex':'none';button.setAttribute('aria-expanded',String(visible));if(visible)live.refresh().catch(()=>{});
    // Respect a closed panel on the next page load instead of reopening it every time.
    if(remember)chrome.storage.local.set({popupClosed:!visible}).catch(()=>{});
    // This message contains no email data; the child accepts only its TU parent.
    frame?.contentWindow?.postMessage({type:'campus-visibility',visible},'*');
  }
  panel.style.display='none';button.onclick=()=>togglePopup();close.onclick=()=>togglePopup(false);shadow.append(panel,button);document.documentElement.append(host);
  if(new URL(location.href).searchParams.get('_task')==='mail'||document.querySelector('#messagelist,#messagebody'))chrome.storage.local.get('popupClosed').then(saved=>saved.popupClosed?undefined:togglePopup(true,undefined,false)).catch(()=>{});
})();
