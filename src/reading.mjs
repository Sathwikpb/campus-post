const QUOTE_HEADER=/\n(?:Am .+ schrieb|On .+ wrote|[- ]*Original Message[- ]*|Von:|From:)/i;
const LIST_FOOTER=/\n(?:[_-]{5,}\s*\n)?(?:active-students|students|master-mnt)\s+mailing list\b|\nWenn Sie keine Nachrichten über diesen Verteiler|\nCopyright\s+©|\nThis email message, including any attached files/i;
export function currentText(body=''){
 const unquoted=body.split(QUOTE_HEADER)[0].split(LIST_FOOTER)[0];
 const own=unquoted.split('\n').filter(s=>!/^\s*>/.test(s)).join('\n');
 // A forwarded post can consist entirely of quoted lines. Keep its content
 // (without the quote markers) instead of returning an empty message.
 if(own.replace(/\s+/g,'').length<20&&/^\s*>/m.test(unquoted))return unquoted.split('\n').map(s=>s.replace(/^\s*(?:>\s?)+/,'')).join('\n');
 return own;
}
export function sentences(body=''){
 // A period after a number is part of a German date/ordinal, not a sentence end.
 // "word.Next" (missing space) is still a sentence boundary.
 return body.split(/\n|(?<=[!?])\s+|(?<!\b(?:Dr|Prof|Mr|Mrs|Ms|No|ca|bzw|z\.B|u\.a|p\.m|a\.m|e\.g|i\.e|Nr|Str|Tel)\.)(?<!\b\d{1,2}\.)(?<=\.)\s+(?=[A-ZÄÖÜ])|(?<=[a-zäöüß]{3}\.)(?=[A-ZÄÖÜ][a-zäöüß])/).map(s=>s.replace(/^[\s•–*-]+/,'').replace(/[ \t ]+/g,' ').trim()).filter(Boolean);
}
const DE=/\b(?:der|die|das|und|Sie|bitte|für|zum|eine|Einweisung|Anmeldung|Hallo|Studierende|können|ist|werden|sich|Umfrage|Einschreibung|verpflichtend|wir|nicht|mit|auf|dich|euch|ihr|wird|auch|Wichtige)\b/gi;
const EN=/\b(?:the|you|your|please|we|this|will|Dear|Hello|registration|meeting|account|students|have|need|from|and|are|with|for|is|our|can)\b/gi;
const count=(text,re)=>(text.match(re)||[]).length;
// Lines that separate language versions: rulers ("-----", "*****") and
// announcements such as "*** German version below ***" or "[English]".
const SEPARATOR=/^[ \t]*[-_=*~#/|.–—]{5,}[ \t]*$/;
const MARKER=/^[ \t]*[-_=*~#/|\[(–— ]*(?:English|German|Deutsch|Deutsche|Englisch)(?:\s+(?:version|translation|text|fassung|übersetzung))?(?:\s+(?:below|follows|unten|folgt|see below|siehe unten))?[ \t]*[-_=*~#/|\])–—:. ]*$/i;
const GREETING=/^[ \t]*(?:Dear|Hello|Hi|Liebe|Lieber|Hallo|Sehr geehrte)\b/i;
const CLOSING=/\n\s*(?:Best regards|Kind regards|Best wishes|Many greetings|Best|Cheers|Your team of|Viele Grüße|Liebe Grüße|Beste Grüße|Mit freundlichen Grüßen|Herzliche Grüße)[,!]?\s*\n/i;
function sections(text){
 const out=[];let current=[];
 const push=()=>{const t=current.join('\n').trim();if(t)out.push(t);current=[];};
 for(const line of text.split('\n')){
  if(SEPARATOR.test(line)||MARKER.test(line)){push();continue;}
  if(GREETING.test(line))push();
  current.push(line);
 }
 push();
 return out.map(t=>{const en=count(t,EN),de=count(t,DE);return {text:t,en,de,english:en>=3&&en>de*1.5,german:de>=3&&de>en*1.2};});
}
export function readingText(body,target='en'){
 const clean=currentText(body);if(target!=='en')return {text:clean,language:'original',usesExistingEnglish:false,needsTranslation:false};
 const deCount=count(clean,DE),enCount=count(clean,EN);
 const parts=sections(clean),english=parts.filter(p=>p.english),german=parts.filter(p=>p.german);
 // Bilingual: keep the English sections in order and drop the German ones.
 if(english.length&&german.length){
  let text=english.map(p=>p.text).join('\n');
  // A German greeting copied above the English text is not part of it.
  text=text.split('\n').filter(line=>!(/^[ \t]*(?:Liebe|Lieber|Hallo|Sehr geehrte)\b/i.test(line)&&line.length<80)).join('\n');
  return {text:text.split(CLOSING)[0].trim(),language:'en',usesExistingEnglish:true,needsTranslation:false};
 }
 const language=deCount>=2&&deCount>enCount*1.2?'de':enCount>0?'en':'unknown';
 const text=language==='en'?clean.split(CLOSING)[0]:clean;
 return {text,language,usesExistingEnglish:false,needsTranslation:language==='de'};
}
