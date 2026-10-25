import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {JSDOM} from 'jsdom';
const code=await fs.readFile('extension/bridge.js','utf8');
const wait=()=>new Promise(resolve=>setTimeout(resolve,20));
async function page(initial={}){
 const dom=new JSDOM('<body><div id="messagelist"></div></body>',{url:'https://webmail.tu-ilmenau.de/?_task=mail',runScripts:'outside-only'}),w=dom.window;
 const store={privacyConsent:{version:1},...initial},gets=[],changed=[];let listener;
 w.setInterval=()=>1;w.CampusPostReader={read:()=>null};
 w.chrome={runtime:{id:'ext',getURL:p=>'chrome-extension://ext/'+p,sendMessage:async()=>({ok:true,tabId:5}),onMessage:{addListener:f=>listener=f}},
  storage:{onChanged:{addListener:f=>changed.push(f),removeListener(){}},local:{get:async key=>{gets.push(key);const keys=[].concat(key);return Object.fromEntries(keys.filter(k=>k in store).map(k=>[k,store[k]]));},set:async value=>{const old={...store};Object.assign(store,value);for(const f of changed)f(Object.fromEntries(Object.keys(value).map(k=>[k,{oldValue:old[k],newValue:value[k]}])),'local');}}}};
 w.eval(code);await wait();
 const shadow=w.document.querySelector('#campus-post-open').shadowRoot;
 const send=message=>new Promise(resolve=>listener(message,{id:'ext',url:'chrome-extension://ext/dashboard.html?tab=5'},resolve));
 return {dom,w,store,gets,changed,shadow,panel:shadow.querySelector('section'),send};
}
const first=await page();
assert.equal(first.panel.hidden,false,'panel opens automatically on a mail page');
assert.equal(first.store.popupClosed,undefined,'automatic opening is not stored as a user choice');
[...first.shadow.querySelectorAll('button')].find(b=>b.textContent==='×').click();await wait();
assert.equal(first.panel.hidden,true);assert.equal(first.store.popupClosed,true,'closing is remembered');
// Consent is read once, then served from cache until storage reports a change.
const before=first.gets.filter(k=>k==='privacyConsent').length;
assert.equal((await first.send({type:'restore'})).ok,true);assert.equal((await first.send({type:'restore'})).ok,true);
assert.equal(first.gets.filter(k=>k==='privacyConsent').length-before,1,'consent cached between mailbox requests');
await first.w.chrome.storage.local.set({privacyConsent:null});
const revoked=await first.send({type:'restore'});assert.equal(revoked.ok,false,'revoked consent is honoured immediately');assert.match(revoked.error,/Enable email tools/);
first.dom.window.close();
const second=await page({popupClosed:true});
assert.equal(second.panel.hidden,true,'a closed panel stays closed on the next page load');
[...second.shadow.querySelectorAll('button')].find(b=>b.textContent.includes('Campus Post')).click();await wait();
assert.equal(second.panel.hidden,false);assert.equal(second.store.popupClosed,false,'reopening is remembered');
second.dom.window.close();
console.log('Bridge passed: remembered panel state, consent cache and immediate revocation.');
