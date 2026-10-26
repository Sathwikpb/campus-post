import {sourceClocks} from './clocks.mjs';
import {currentText,sentences,readingText} from './reading.mjs';
export {sentences,readingText} from './reading.mjs';
import PostalMime from 'postal-mime';
import {Parser} from 'htmlparser2';
import {casual as de} from '../node_modules/chrono-node/dist/esm/locales/de/index.js';
import {casual as en} from '../node_modules/chrono-node/dist/esm/locales/en/index.js';

export function htmlText(html) {
  let out='', skip=0;
  const blocked=new Set(['script','style','head','template','svg']);
  const parser=new Parser({onopentag(name){if(blocked.has(name))skip++;if(!skip&&/^(p|div|br|tr|li|h[1-6])$/.test(name))out+='\n';},ontext(text){if(!skip)out+=text;},onclosetag(name){if(blocked.has(name))skip=Math.max(0,skip-1);if(!skip&&/^(p|div|tr|li)$/.test(name))out+='\n';}},{decodeEntities:true});
  parser.write(html||'');parser.end();return out.replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n').trim();
}
export async function parseMail(base64) {
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  const email=await PostalMime.parse(bytes,{maxNestingDepth:30});
  const body=email.text||htmlText(email.html);
  return {subject:email.subject||'University email',body,sender:email.from?.address||'',received:email.date||'',links:extractLinks(body,email.html)};
}
export function extractLinks(body,html='') {
  const found=[];let anchor=null,context='';
  const parser=new Parser({onopentag(name,attrs){if(name==='a')anchor={url:attrs.href||'',label:'',context:context.slice(-200)};},ontext(text){context+=text+' ';if(anchor)anchor.label+=text;},onclosetag(name){if(name==='a'&&anchor){found.push(anchor);anchor=null;}}},{decodeEntities:true});parser.write(html);parser.end();
  for(const m of body.matchAll(/https?:\/\/[^\s<>"\]]+/g))found.push({url:m[0].replace(/[).,;]+$/,''),label:'',context:body.slice(Math.max(0,m.index-160),m.index+180)});
  return classifyLinks(found);
}
export function classifyLinks(found=[]) {
  const links=[],seen=new Set();
  for(const item of found){let u;try{u=new URL(item.url);}catch{continue;}if(!['https:','http:','mailto:'].includes(u.protocol)||u.username||u.password)continue;
    if(u.hostname==='webmail.tu-ilmenau.de'&&u.searchParams.get('_action')==='get')continue;
    if(seen.has(u.href))continue;seen.add(u.href);
    const evidence=(item.label+' '+(item.context||'')+' '+u.href).toLowerCase();
    const type=/unsubscribe|leave@|austragen|abmelden/.test(evidence)?'Unsubscribe':/webex\.com|zoom\.us|meet\.google|teams\.microsoft/.test(u.hostname)?'Join meeting':/moodle.*message\/index/.test(u.href)?'Reply in Moodle':u.protocol==='mailto:'?'Contact':/registr|anmeld|book|beratungsslot|course\/open|enroll/.test(evidence)||u.hostname==='campus.tu-ilmenau.de'?'Register / book':'Open link';
    links.push({url:u.href,label:item.label?.trim()||u.hostname||u.pathname,type});
  }
  return links.sort((a,b)=>['Join meeting','Register / book','Reply in Moodle','Contact','Open link','Unsubscribe'].indexOf(a.type)-['Join meeting','Register / book','Reply in Moodle','Contact','Open link','Unsubscribe'].indexOf(b.type));
}
export function splitText(text,max=3500) {
  const chars=Array.from(text);const parts=[];
  for(let i=0;i<chars.length;){let end=Math.min(i+max,chars.length);if(end<chars.length){for(let j=end;j>i+max*.65;j--){if(/\s/.test(chars[j-1])){end=j;break;}}}parts.push(chars.slice(i,end).join(''));i=end;}
  return parts;
}
function pad(n){return String(n).padStart(2,'0');}
const POST_STAMP=/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s+\d{1,2}\.?\s+\p{L}+\s+\d{4},\s+\d{1,2}:\d{2}(?:\s*[AP]M)?$/iu;
function validDayMonth(d,m){return Number(d)>=1&&Number(d)<=31&&Number(m)>=1&&Number(m)<=12;}
// "17.00 Uhr", "um 9.30", "6.30 - 8 p.m." are clock times, not dates.
export function normalizeTimes(text){
 const clock=(h,m)=>Number(h)<24&&Number(m)<60;
 return text
  .replace(/\b(\d{1,2})\.(\d{2})(?=\s*(?:Uhr|h\b|[ap]\.?m\.?|o'clock))/gi,(all,h,m)=>clock(h,m)?h+':'+m:all)
  .replace(/\b(at|um|ab|bis|von|from|to|until|starting)\s+(\d{1,2})\.(\d{2})\b/gi,(all,w,h,m)=>clock(h,m)?w+' '+h+':'+m:all)
  .replace(/\b(\d{1,2})\.(\d{2})(\s*[-–]\s*\d{1,2}(?:[:.]\d{2})?\s*(?:Uhr|h\b|[ap]\.?m\.?))/gi,(all,h,m,rest)=>clock(h,m)?h+':'+m+rest.replace(/(\d)\.(\d{2})/,'$1:$2'):all)
  .replace(/(?<![\d.:])(\d{1,2})(?::(\d{2}))?\s*[-–]\s*(\d{1,2})(?::(\d{2}))?\s*Uhr\b/gi,(all,h,m,h2,m2)=>clock(h,m||0)&&clock(h2,m2||0)&&Number(h)<Number(h2)?'von '+h+':'+(m||'00')+' bis '+h2+':'+(m2||'00')+' Uhr':all)
  .replace(/\b(\d{1,2})(?:[:.](\d{2}))?\s*[-–]\s*(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\.?/gi,(all,h,m,h2,m2,p)=>Number(h)<Number(h2)&&Number(h2)<12&&clock(h,m||0)&&clock(h2,m2||0)?'from '+h+':'+(m||'00')+' '+p+'m to '+h2+':'+(m2||'00')+' '+p+'m':all);
}
function component(c){const date=`${c.get('year')}-${pad(c.get('month'))}-${pad(c.get('day'))}`;return {date,time:c.isCertain('hour')?`${pad(c.get('hour'))}:${pad(c.get('minute')||0)}`:''};}
// Display clean-up for extracted sentences: drop bracketed URLs and
// capitalise a sentence that continued after a greeting line.
export function tidy(text){return text.replace(/\s*<https?:[^>\s]+>/g,'').replace(/\s*\[(?:https?:|cid:)[^\]\s]+\]/g,'').replace(/\.\.(?=\s|$)/g,'.').replace(/^\p{Ll}/u,c=>c.toUpperCase()).trim();}
// Greeting tails ("staff, and students,"), lone times and footers are not key points.
function fragment(text){return POST_STAMP.test(text)||text.length<45&&/,$/.test(text)||/^(?:from|ab|at|um|on|am)?\s*\d{1,2}(?::\d{2})?\s*(?:[ap]m|Uhr)?$/i.test(text)||/unsubscribe|manage your (?:email )?preferences|abmelden vom|newsletter abbestellen/i.test(text)||text.replace(/https?:\S+/g,'').trim().length<12;}
export function analyze(mail,now=new Date(),target='en') {
  const hasReceived=Number.isFinite(Date.parse(mail.received));
  const actualReference=hasReceived?new Date(mail.received):new Date(now);
  const referenceParts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(actualReference).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
  const reference=new Date(Number(referenceParts.year),Number(referenceParts.month)-1,Number(referenceParts.day),12);
  const subjectYear=mail.subject.match(/\b(20\d{2})\b/)?.[1];
  // Ignore quoted history when a conventional reply separator is present.
  const clean=currentText(mail.body),reading=readingText(mail.body,target);
  const lines=sentences(reading.text).map(line=>line.replace(/^(?:Dear\s+(?:students|colleagues|all|participants)|Hello\s+everyone|Hi\s+all)[,!]\s*/i,'')).filter(Boolean);
  const dateEvidence=/\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|today|tomorrow|yesterday|heute|morgen|gestern|Jan(?:uary|uar)?|Feb(?:ruary|ruar)?|March|März|April|May|Mai|June|Juni|July|Juli|August|Sept?(?:ember)?|Oct(?:ober)?|Okt(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|Dez(?:ember)?)\b|\b\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?\b|\b20\d{2}-\d{2}-\d{2}\b/i;
  const scored=lines.filter(s=>! /^(?:liebe |hallo |dear |hello |hi |[-= ]*(?:English|German) version|\[English\]|mit freundlichen|best regards|best wishes|kind regards|copyright|all other registered|this email message|\*+ Please do not respond|User Count:|Type:|Usage:|\[private|[_-]{4})/i.test(s)).map((text,i)=>({text,i,score:(/Step\s+\d/i.test(text)?10:0)+(/frist|deadline|prüfung|exam|abgabe|submit|anmeldung|register|cancel|fällt aus|verschoben|spätestens|must|müssen|need to|verpflichtend|einweisung|Step \d|activate|install/i.test(text)?4:0)+(dateEvidence.test(text)?3:0)+(/bitte|please|raum|room|Audimax|EAZ/i.test(text)?2:0)}));
  const summary=scored.filter(s=>!fragment(s.text)).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,4).sort((a,b)=>a.i-b.i).map(s=>tidy(s.text));
  const events=[],seen=new Set();
  const schedulePattern=/jeden|jede woche|wöchentlich|weekly|every (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag)\s*&\s*/i;
  const schedules=lines.filter(line=>schedulePattern.test(line));
  const alternativeDates=reading.text.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s+or\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})/gi,(_,month,a,b,year)=>month+' '+a+', '+year+'\n'+month+' '+b+', '+year);
  const hasAlternatives=alternativeDates!==reading.text;
  const attachedSchedule=/attach(?:ed|ment)|beigefügt/i.test(reading.text)&&/registration|withdrawal|anmelde|rücktritt/i.test(reading.text);
  for(const source of [...lines,...(hasAlternatives?sentences(alternativeDates):[]),mail.subject]){
  const lineReference=new Date(reference);if(subjectYear&&!/tomorrow|today|morgen|heute|nächste|next\s/i.test(source))lineReference.setFullYear(Number(subjectYear));
  const normalized=normalizeTimes(source).replace(/\((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Mon?|Tue?|Wed|Thu|Fri|Sat|Sun|Di|Mi|Do|Fr|Sa|So)\.?\)/gi,'').replace(/(?<![\d.,])(\d{1,2})\.(\d{1,2})(\.)?(?!\d|,\d|\.\d)/g,(all,d,m,dot)=>validDayMonth(d,m)&&(dot||m.length===2)?`${d}.${m}.${lineReference.getFullYear()}`:all).replace(/zwischen\s+(\d{1,2})(?::(\d{2}))?\s+und\s*(\d{1,2})(?::(\d{2}))?/gi,(_,a,b,c,d)=>`von ${a}:${b||'00'} bis ${c}:${d||'00'}`).replace(/between\s+(\d{1,2})(?::(\d{2}))?\s+and\s*(\d{1,2})(?::(\d{2}))?/gi,(_,a,b,c,d)=>`from ${a}:${b||'00'} to ${c}:${d||'00'}`);
  if(!dateEvidence.test(source))continue;
  // A bare post timestamp ("Wednesday, 14 October 2026, 4:35 PM") is metadata.
  if(POST_STAMP.test(source.trim()))continue;
  if(schedulePattern.test(source)&&!/[0-9]{1,2}[./][0-9]{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d|\d\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)/i.test(source))continue;
  // "14.-21.04.2028" is a day range within one month.
  const expanded=normalized.replace(/(?<![\d.])(\d{1,2})\.\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/g,(all,d1,d2,m,y)=>validDayMonth(d1,m)&&validDayMonth(d2,m)&&Number(d1)<Number(d2)?`${d1}.${m}.${y} bis ${d2}.${m}.${y}`:all);
  const european=expanded.replace(/(?<![\d.])(\d{1,2})[./](\d{1,2})[./](20\d{2})\b/g,(_,day,month,year)=>year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0'));
  const englishLine=/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|the|will|from|between|tomorrow|today|yesterday|meeting|at)\b/i.test(source);
  const parsed=(englishLine||reading.language==='en'?en.parse(european,lineReference):de.parse(expanded,lineReference)).sort((a,b)=>a.index-b.index||b.text.length-a.text.length),occupied=[];
  for(const r of parsed){
    if(!dateEvidence.test(r.text))continue;
    // Relative offsets need their referenced exam, not the email's sent date.
    // Chrono also interprets "last day of the lecture period" as yesterday.
    if(/\blast day\b|\bletzte[nrms]? tag\b/i.test(r.text))continue;
    if(/before|vorher|zuvor/i.test(source)&&/^(?:\d+|one|two|three|four|five|six|seven|vier)\s+(?:days?|tage?)/i.test(r.text))continue;
    if(occupied.some(([a,b])=>r.index<b&&r.index+r.text.length>a))continue;
    occupied.push([r.index,r.index+r.text.length]);
    const start=component(r.start);let end=r.end?component(r.end):null;const clocks=sourceClocks(normalized);if(!start.time&&clocks?.start)start.time=clocks.start;if(clocks?.end){if(!end)end={date:start.date,time:clocks.end};else if(end.date===start.date&&!end.time)end.time=clocks.end;}
    if(!r.start.isCertain('day')&&!r.start.isCertain('weekday')&&!/heute|morgen|today|tomorrow/i.test(r.text))continue;
    // Without a written year, a date more than ~18 months away is a misreading.
    if(!/\b20\d{2}\b/.test(source)&&Math.abs(new Date(start.date+'T12:00:00Z')-lineReference)>550*864e5)continue;
    const cancelled=/fällt\s+aus|abgesagt|cancelled|canceled|verschoben|rescheduled|nicht statt/i.test(mail.subject+' '+source);
    const explicit=(/\b20\d{2}\b/.test(source)||!!subjectYear)&&r.start.isCertain('month')&&r.start.isCertain('day')&&!/tomorrow|today|morgen|heute|nächste|next\s/i.test(r.text);
    const timezoneAmbiguous=/\b(?:UTC|GMT|CEST|CET|EST|EDT|PST|PDT|MEZ|MESZ)\b|[+-]\d{2}:?\d{2}/i.test(source.replace(/\d{4}-\d{2}-\d{2}/g,''));
    const recurring=/jeden|jede woche|wöchentlich|weekly|every (?:week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:Monday|Tuesday|Wednesday|Thursday|Friday|Montag|Dienstag|Mittwoch|Donnerstag|Freitag)\s*&\s*/i.test(source);
    const key=start.date+'T'+start.time;if(seen.has(key))continue;if(!start.time&&events.some(e=>e.startDate===start.date))continue;seen.add(key);
    const ambiguousTime=/\bat\s+(?:[1-9]|1[0-2])[:.]\d{2}\b/i.test(source)&&! /\b(?:[ap]m\b|[ap]\.m\.)/i.test(source);
    const bookingWindow=/between|zwischen/i.test(source)&&/book an appointment|registration|beratungsslot|anmelden|anmeldung/i.test(clean);
    const weekday=source.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Sonntag|Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag)\b/i)?.[1]?.toLowerCase();
    const weekdayIndex=weekday?Math.max(['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekday),['sonntag','montag','dienstag','mittwoch','donnerstag','freitag','samstag'].indexOf(weekday)):-1;
    // Only meaningful when one date is on the line; otherwise the weekday may belong to another date.
    const weekdayConflict=weekdayIndex>=0&&parsed.length===1&&new Date(start.date+'T12:00:00Z').getUTCDay()!==weekdayIndex;
    const administrative=/regardless of|unabhängig/i.test(source)&&/examination date|prüfungstermin/i.test(source);
    const metadata=/^(?:Start Date|End Date|Valid (?:from|until)|Gültig (?:ab|bis))\s*:/i.test(source)||/licen[cs]e|Lizenz/i.test(mail.subject);
    const historical=/\b(?:lost|verloren|yesterday|gestern)\b/i.test(source+' '+mail.subject);
    const range=!!end&&end.date!==start.date;
    const sentDay=hasReceived?`${referenceParts.year}-${pad(referenceParts.month)}-${pad(referenceParts.day)}`:'';
    const beforeSent=!!sentDay&&(end?.date||start.date)<sentDay;
    if(/\b(?:today|heute)\b/i.test(r.text)&&!/meeting|event|at\s+\d|Uhr|workshop|session|Treffen|Vortrag|findet|statt/i.test(source))continue;
    const warnings=[metadata?'Validity date — not an appointment':null,historical||beforeSent?'Historical reference — not an upcoming appointment':null,range?'Date range or opening window — choose the applicable day':null,hasAlternatives?'Alternative deadlines — check which applies to your module':null,attachedSchedule?'Check the attached schedule for your module':null,administrative?'Administrative examination date — actual assessment date may differ':null,cancelled?'Cancellation or rescheduling':null,!explicit?'Date inferred from the email date':null,!hasReceived&&!explicit?'Original email date is missing':null,ambiguousTime?'Confirm AM or PM':null,weekdayConflict?'Weekday conflicts with the inferred date':null,bookingWindow?'Availability window — book your own slot':null,timezoneAmbiguous?'Explicit time zone needs review':null,recurring?'Recurring schedule needs review':null].filter(Boolean);
    const location=source.match(/Haus\s+[A-Z]\s*,?\s*(?:Raum|room)\s+[\w-]+|\bAudimax\b|\bEAZ\s+[\d/.-]+|\bTGZ\s*(?:\([^)]*\))?/i)?.[0]||'';
    const course=clean.match(/students on the ([^,.!\n]+)/i)?.[1];
    const title=/^New message from /i.test(mail.subject)&&/meeting|online/i.test(clean)?(course?course+' · ':'')+'Online meeting':mail.subject.replace(/^\[[^\]]+\]\s*/,'');
    events.push({title,startDate:start.date,startTime:start.time,endDate:end?.date||start.date,endTime:end?.time||'',source,location,cancelled,explicit,warnings,clear:explicit&&!warnings.length});
  }}
  for(let i=events.length-1;i>=0;i--)if(!events[i].startTime&&events.some(e=>e!==events[i]&&e.startTime&&e.startDate===events[i].startDate))events.splice(i,1);
  const links=classifyLinks([...(mail.links||[]),...extractLinks(mail.body)]);
  for(const event of events)event.links=links.filter(l=>['Join meeting','Register / book'].includes(l.type));
  const eligibility=lines.filter(s=>/ausschließlich|only for|nur für|must be (?:a|an)|berechtigt/i.test(s));
  return {schedules,summary:reading.needsTranslation?[]:summary,events,links,eligibility:reading.needsTranslation?[]:eligibility,readingBody:reading.text,readingLanguage:reading.language,usesExistingEnglish:reading.usesExistingEnglish,needsTranslation:reading.needsTranslation,hasChange:/abgesagt|fällt aus|cancelled|canceled|verschoben|rescheduled/i.test(mail.subject+' '+clean)};
}
function escape(s){return String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');}
function fold(s){let out='',line='',n=0;for(const c of s){const k=new TextEncoder().encode(c).length;if(n+k>73){out+=line+'\r\n ';line='';n=1;}line+=c;n+=k;}return out+line;}
function checkedDate(d){const dt=new Date(d+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(+dt)||dt.toISOString().slice(0,10)!==d)throw Error('Enter a valid date.');return dt;}
export function eventTimes(e){
  checkedDate(e.startDate);checkedDate(e.endDate||e.startDate);
  const compact=d=>d.replace(/-/g,'');
  if(!e.startTime){const end=checkedDate(e.endDate||e.startDate);end.setUTCDate(end.getUTCDate()+1);return {start:compact(e.startDate),end:compact(end.toISOString().slice(0,10)),allDay:true};}
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.startTime)||e.endTime&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.endTime))throw Error('Enter a valid time.');
  const start=e.startDate+'T'+e.startTime;
  let end=(e.endDate||e.startDate)+'T'+(e.endTime||'');
  if(!e.endTime){const dt=new Date((e.endDate||e.startDate)+'T'+e.startTime+':00Z');dt.setUTCHours(dt.getUTCHours()+1);end=dt.toISOString().slice(0,16);}
  if(end<=start)throw Error('The end must be after the start.');
  return {start:start.replace(/[-:]/g,'')+'00',end:end.replace(/[-:]/g,'')+'00',allDay:false};
}
export function calendar(events){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Campus Post//Student agenda//EN','CALSCALE:GREGORIAN','X-WR-TIMEZONE:Europe/Berlin','BEGIN:VTIMEZONE','TZID:Europe/Berlin','BEGIN:DAYLIGHT','DTSTART:19960331T020000','TZOFFSETFROM:+0100','TZOFFSETTO:+0200','TZNAME:CEST','RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU','END:DAYLIGHT','BEGIN:STANDARD','DTSTART:19961027T030000','TZOFFSETFROM:+0200','TZOFFSETTO:+0100','TZNAME:CET','RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU','END:STANDARD','END:VTIMEZONE'];
  for(const e of events){const t=eventTimes(e);lines.push('BEGIN:VEVENT','UID:'+(e.id||crypto.randomUUID())+'@campus-post','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),(t.allDay?'DTSTART;VALUE=DATE:':'DTSTART;TZID=Europe/Berlin:')+t.start,(t.allDay?'DTEND;VALUE=DATE:':'DTEND;TZID=Europe/Berlin:')+t.end,'SUMMARY:'+escape(e.title),'LOCATION:'+escape(e.location||''),'DESCRIPTION:'+escape([e.source,...(e.links||[]).map(l=>l.type+': '+l.url)].filter(Boolean).join('\n')),'END:VEVENT');}
  return lines.concat('END:VCALENDAR').map(fold).join('\r\n')+'\r\n';
}
export function googleCalendar(e){const t=eventTimes(e);const u=new URL('https://calendar.google.com/calendar/render');u.searchParams.set('action','TEMPLATE');u.searchParams.set('text',e.title);u.searchParams.set('dates',t.start+'/'+t.end);u.searchParams.set('ctz','Europe/Berlin');u.searchParams.set('location',e.location||'');u.searchParams.set('details',[e.source,...(e.links||[]).map(l=>l.type+': '+l.url)].filter(Boolean).join('\n'));return u.href;}
export async function hash(text){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}


