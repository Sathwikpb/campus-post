import {splitText} from './core.js';
const translators=new Map();let summarizer,summaryPreparing;
export function translationReady(source,target){return source===target||translators.has(source+'-'+target);}
export function support(){return {translation:typeof globalThis.Translator!=='undefined',summary:typeof globalThis.Summarizer!=='undefined'};}
export async function prepareTranslation(source,target,progress=()=>{}){
  const key=source+'-'+target;if(source===target)return;if(translators.has(key))return;
  if(!support().translation)throw Error('This browser has no built-in Translator API. Use Google Translate below, or Chrome’s right-click → Translate option on webmail. No API key is required for those options.');
  const options={sourceLanguage:source,targetLanguage:target};
  if(await Translator.availability(options)==='unavailable')throw Error('This language pair is unavailable on this computer. Choose another language or use Google Translate.');
  progress('Preparing language download…');
  const instance=await Translator.create({...options,monitor(m){m.addEventListener('downloadprogress',e=>progress('Language download: '+Math.round(e.loaded*100)+'%'));}});
  translators.set(key,instance);progress('Language ready.');
}
export async function translateTexts(texts,source,target,progress=()=>{}){
  if(source===target)return texts;
  const instance=translators.get(source+'-'+target);if(!instance)throw Error('Choose “Prepare language” first. The browser may need to download a language pack.');
  const results=[];let done=0;
  for(const text of texts){const translated=[];for(const part of splitText(text))translated.push(await instance.translate(part));results.push(translated.join('\n'));progress(`Translated ${++done} of ${texts.length}`);}
  return results;
}
async function bounded(promise,ms,message,onLate=()=>{}){
 let expired=false,timer;
 const pending=Promise.resolve(promise).then(value=>{if(expired){onLate(value);throw Error(message);}return value;});
 try{return await Promise.race([pending,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error(message));},ms);})]);}finally{clearTimeout(timer);}
}
export async function prepareSummary(progress=()=>{},{timeoutMs=60000}={}){
 if(summarizer)return;if(summaryPreparing)return summaryPreparing;
 if(!support().summary)throw Error('Built-in summaries are unavailable in this browser. Key-sentence summaries still work, without an account.');
 const options={type:'key-points',format:'plain-text',length:'medium',expectedInputLanguages:['en','de'],outputLanguage:'en'};
 summaryPreparing=(async()=>{
  const availability=await bounded(Summarizer.availability(options),Math.min(timeoutMs,10000),'Browser model support check timed out. Email reading still works without this model.');
  if(availability==='unavailable')throw Error('Browser summaries are unsupported on this device. Key sentences, links and calendar drafts still work.');
  progress('Preparing optional browser model. You can continue reading emails.');
  summarizer=await bounded(Summarizer.create({...options,monitor(m){m.addEventListener('downloadprogress',e=>progress('Optional summary model download: '+Math.round(e.loaded*100)+'%. Email reading remains available.'));}}),timeoutMs,'Browser model setup timed out. Email reading still works. Retry later or use the local key sentences.',late=>late?.destroy?.());
  progress('Browser summaries ready.');
 })();
 try{await summaryPreparing;}catch(error){progress(error.message);throw error;}finally{summaryPreparing=null;}
}
export async function understand(mail,progress=()=>{}){
  if(!summarizer)throw Error('Choose “Enable browser summaries” first. No paid account is needed.');
  const sections=splitText(mail.subject+'\n'+mail.body,10000),summaries=[];
  for(let i=0;i<sections.length;i++){progress(`Summarizing part ${i+1} of ${sections.length}…`);summaries.push(await summarizer.summarize(sections[i],{context:'Summarize this university email. Include required actions, eligibility, booking links mentioned, meeting details and deadlines. Do not invent missing dates or assume a booking has been confirmed.'}));}
  return summaries.join('\n\n');
}
