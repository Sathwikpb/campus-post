import {splitText} from './core.js';
const translators=new Map();let summarizer;
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
export async function prepareSummary(progress=()=>{}){
  if(summarizer)return;
  if(!support().summary)throw Error('Built-in summaries are unavailable in this browser. Key-sentence summaries still work, without an account.');
  const options={type:'key-points',format:'plain-text',length:'medium',expectedInputLanguages:['en','de'],outputLanguage:'en'};
  if(await Summarizer.availability(options)==='unavailable')throw Error('This computer does not meet Chrome’s requirements for built-in summaries. Key sentences remain available.');
  progress('Preparing browser summary model…');
  summarizer=await Summarizer.create({...options,monitor(m){m.addEventListener('downloadprogress',e=>progress('Summary download: '+Math.round(e.loaded*100)+'%'));}});
  progress('Browser summaries ready.');
}
export async function understand(mail,progress=()=>{}){
  if(!summarizer)throw Error('Choose “Enable browser summaries” first. No paid account is needed.');
  const sections=splitText(mail.subject+'\n'+mail.body,10000),summaries=[];
  for(let i=0;i<sections.length;i++){progress(`Summarizing part ${i+1} of ${sections.length}…`);summaries.push(await summarizer.summarize(sections[i],{context:'Summarize this university email. Include required actions, eligibility, booking links mentioned, meeting details and deadlines. Do not invent missing dates or assume a booking has been confirmed.'}));}
  return summaries.join('\n\n');
}
