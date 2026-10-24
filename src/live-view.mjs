import {analyze,splitText} from './core.mjs';
export function createLiveView({shadow,panel,read,openFull}){
 const style=document.createElement('style');style.textContent='.cp-live{flex:1;overflow:auto;background:#fafcf7;color:#183d34;padding:18px;font:14px/1.6 system-ui}.cp-live h2{font-size:18px;line-height:1.4;margin:10px 0}.cp-live h3{font-size:14px;margin:18px 0 7px}.cp-live p{margin:7px 0}.cp-live ul{padding-left:20px}.cp-live li{margin:8px 0}.cp-live button,.cp-live a.cp-action{display:inline-block;font:600 12px system-ui;padding:9px;border:1px solid #cbdccc;border-radius:7px;color:#235e48;background:white;margin:5px 5px 5px 0;cursor:pointer;text-decoration:none}.cp-live .cp-note{font-size:12px;color:#657a6e}.cp-live .cp-warning{font-size:12px;background:#fff0d3;padding:8px;border-radius:6px}.cp-live details{margin-top:16px}.cp-live summary{cursor:pointer;font-weight:600}.cp-live pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 system-ui}.cp-live[hidden]{display:none!important}';shadow.append(style);
 const root=document.createElement('div');root.className='cp-live';root.setAttribute('aria-label','Live email view');panel.append(root);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let current='',generation=0,advanced=false,checking=false,translator=null,translatorTarget='',target='en',auto=true,cache=new Map();
 function action(text,fn){const b=el('button',text);b.onclick=()=>Promise.resolve(fn()).catch(e=>{const p=el('p',e.message,'cp-warning');root.prepend(p);});return b;}
 function link(text,url){const a=el('a',text,'cp-action');a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function future(e){return e.startDate>=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
 function paint(mail,data,translation='',note=''){
  root.replaceChildren(el('p','LIVE EMAIL · Updates when you select a message','cp-note'),el('h2',mail.subject),el('p',mail.sender||'University email','cp-note'));
  if(note)root.append(el('p',note,'cp-note'));
  if(data.usesExistingEnglish)root.append(el('p','Using the English version included in the email.','cp-note'));
  if(data.needsTranslation&&!translation)root.append(el('p','German-only message. Enable local translation below to read it in '+target.toUpperCase()+'.','cp-warning'));
  root.append(el('h3','Main points'));const list=el('ul');data.summary.forEach(text=>list.append(el('li',text)));root.append(list);
  if(!data.summary.length)root.append(el('p',data.needsTranslation?'An English summary needs translation first.':'No concise summary found. Read the original below.','cp-note'));
  if(data.eligibility.length){root.append(el('h3','Who this is for'));data.eligibility.forEach(text=>root.append(el('p',text)));}
  const links=data.links.filter(l=>l.type!=='Unsubscribe');if(links.length){root.append(el('h3','Useful links'));links.slice(0,15).forEach(l=>{let host='';try{host=new URL(l.url).hostname;}catch{}root.append(link(l.type+' ↗ '+(l.label&&l.label.length<45?l.label:host),l.url));});}
  root.append(el('h3','Dates and times'));
  if(!data.events.length)root.append(el('p','No concrete event date detected.','cp-note'));
  for(const e of data.events){root.append(el('p',e.startDate+(e.startTime?' · '+e.startTime:'')+(e.endTime?'–'+e.endTime:'')+(e.location?' · '+e.location:'')));const warnings=[...e.warnings];if(!future(e))warnings.unshift('Past date');if(warnings.length)root.append(el('p',warnings.join(' · '),'cp-warning'));}
  if(data.schedules?.length){root.append(el('h3','Repeating / opening hours'));data.schedules.forEach(s=>root.append(el('p',s)));root.append(el('p','Choose a day in the stated period; these are not confirmed bookings.','cp-note'));}
  if(data.hasChange)root.append(el('p','A cancellation or change is mentioned. Review the original.','cp-warning'));
  const controls=el('div');controls.append(action('Refresh this email',()=>{current='';return refresh();}),action('Inbox & agenda ↗',openFull));
  if(data.needsTranslation&&!translation){
   if(typeof globalThis.Translator!=='undefined')controls.append(action('Enable local German → '+target.toUpperCase(),async()=>{const t=target;if(await Translator.availability({sourceLanguage:'de',targetLanguage:t})==='unavailable')throw Error('This language pair is unavailable here.');translator=await Translator.create({sourceLanguage:'de',targetLanguage:t,monitor(m){m.addEventListener('downloadprogress',()=>{});}});translatorTarget=t;current='';await refresh();}));
   else root.append(el('p','This browser does not expose the on-device Translator API. Automatic local translation is unavailable here. Google Translate can be opened manually from the full assistant; it receives the chosen text.','cp-note'));
  }
  controls.append(link('Get updates ↗','https://github.com/Sathwikpb/campus-post/releases/latest'));root.append(controls);
  if(translation){const d=el('details');d.open=true;d.append(el('summary','Full local translation'),el('pre',translation));root.append(d);}
  const original=el('details');original.append(el('summary','Read original email'),el('pre',mail.body));root.append(original,el('p','Local extraction can miss context. Check important details against the source.','cp-note'));
 }
 async function refresh(){
  if(panel.hidden||advanced||checking)return;checking=true;
  try{
   const stored=await chrome.storage.local.get(['privacyConsent','settings']);
   if(stored.privacyConsent?.version!==1){root.replaceChildren(el('h2','Enable email tools'),el('p','Campus Post reads the open email locally, extracts key details and links, and can use browser-managed on-device translation. It does not send your email to a translation website automatically.'),el('p','Raw source stays in memory; recent decoded emails in the full assistant use temporary session memory. Settings and saved agenda entries stay in this browser profile.'),action('I agree — enable email tools',async()=>{await chrome.storage.local.set({privacyConsent:{version:1,acceptedAt:new Date().toISOString()}});current='';}));return;}
   target=stored.settings?.target||'en';auto=stored.settings?.autoTranslate!==false;
   const mail=read();if(!mail){if(current!=='none'){current='none';generation++;root.replaceChildren(el('h2','Open an email in webmail'),el('p','Its details will appear here. No inbox scan is needed.','cp-note'));}return;}
   const key=target+'|'+mail.subject+'|'+mail.body;if(key===current)return;current=key;const mine=++generation;
   const original=analyze(mail,new Date(),target);paint(mail,original);
   if(!auto||!original.needsTranslation)return;
   if(!translator&&typeof globalThis.Translator!=='undefined'&&await Translator.availability({sourceLanguage:'de',targetLanguage:target})==='available'){translator=await Translator.create({sourceLanguage:'de',targetLanguage:target});translatorTarget=target;}
   if(!translator||translatorTarget!==target)return;
   // Translation is asynchronous; a newer selection can render immediately.
   void (async()=>{let text=cache.get(key);if(!text){const parts=[];for(const part of splitText(original.readingBody||mail.body)){parts.push(await translator.translate(part));if(mine!==generation)return;}text=parts.join('\n');cache.set(key,text);if(cache.size>8)cache.delete(cache.keys().next().value);}
    if(mine!==generation)return;const translated=analyze({...mail,body:text},new Date(),target);paint(mail,{...translated,events:original.events,links:original.links,schedules:original.schedules},text,'Translated locally. Dates and links are checked against the original.');
   })().catch(e=>{if(mine===generation)root.prepend(el('p','Local translation: '+e.message,'cp-warning'));});
  }finally{checking=false;}
 }
 root.append(el('p','Loading the selected email…','cp-note'));
 const timer=setInterval(()=>{refresh().catch(()=>{});},500);
 return {root,refresh,setAdvanced(value){advanced=value;root.hidden=value;if(!value){current='';refresh().catch(()=>{});}},dispose(){clearInterval(timer);}};
}
