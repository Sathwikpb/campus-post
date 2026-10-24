export function currentText(body=''){
 return body.split(/\n(?:Am .+ schrieb|On .+ wrote|[- ]*Original Message[- ]*|Von:|From:)/i)[0].split(/\n(?:[_-]{5,}\s*\n)?(?:active-students|students|master-mnt)\s+mailing list\b|\nWenn Sie keine Nachrichten über diesen Verteiler|\nCopyright\s+©|\nThis email message, including any attached files/i)[0].split('\n').filter(s=>!/^\s*>/.test(s)).join('\n');
}
export function sentences(body=''){
 // A period after a number is part of a German date/ordinal, not a sentence end.
 return body.split(/\n|(?<=[!?])\s+|(?<!\b(?:Dr|Prof|Mr|Mrs|Ms|No)\.)(?<!\b\d{1,2}\.)(?<=\.)\s+(?=[A-ZÄÖÜ])/).map(s=>s.replace(/^[\s•–-]+/,'').replace(/[ \t\u00a0]+/g,' ').trim()).filter(Boolean);
}
export function readingText(body,target='en'){
 const clean=currentText(body);if(target!=='en')return {text:clean,language:'original',usesExistingEnglish:false,needsTranslation:false};
 const deCount=(clean.match(/\b(?:der|die|das|und|Sie|bitte|für|zum|eine|Einweisung|Anmeldung|Hallo|Studierende|können|ist|werden|sich|Umfrage|Einschreibung|verpflichtend)\b/gi)||[]).length;
 const enCount=(clean.match(/\b(?:the|you|your|please|we|this|will|Dear|Hello|registration|meeting|account|students|have|need|from)\b/gi)||[]).length;
 const german=deCount>=2;
 // Notices often announce English at the top, but put the translation after a
 // German signature. Start at its actual greeting, not the announcement.
 const greeting=/^[ \t]*(?:Dear|Hello|Hi)\s+[^\n]{1,120}/im.exec(clean);
 const marker=/^[ \t]*(?:[-–—=]+\s*)?\[?English(?:\s+(?:version|translation))?\]?[ \t]*[:—=-]*[ \t]*$/im.exec(clean);
 let start=-1;if(greeting&&greeting.index>0&&german)start=greeting.index;
 if(marker&&marker.index>0&&german)start=start<0?marker.index+marker[0].length:Math.min(start,marker.index+marker[0].length);
 let selected=start>=0?clean.slice(start).trim():clean;
 const germanSection=/\n[ \t]*(?:\[Deutsch\]|[-–—=]*\s*(?:German|Deutsche)(?:\s+version)?\s*[-–—=]*|Liebe(?:r|n)?\s+[^\n]+|Hallo\s+zusammen[^\n]*)/i.exec(selected);
 if(germanSection&&enCount>0)selected=selected.slice(0,germanSection.index).trim();
 if(start>=0||germanSection&&enCount>0){selected=selected.split(/\n\s*(?:Best regards|Kind regards|Many greetings|Your team of|Viele Grüße|Mit freundlichen Grüßen)[,!]?\s*\n/i)[0];return {text:selected,language:'en',usesExistingEnglish:true,needsTranslation:false};}
 const language=german&&deCount>enCount*1.2?'de':enCount>0?'en':'unknown';
 if(language==='en')selected=selected.split(/\n\s*(?:Best regards|Kind regards|Many greetings)[,!]?\s*\n/i)[0];
 return {text:selected,language,usesExistingEnglish:false,needsTranslation:language==='de'};
}
