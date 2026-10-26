import {sentences,currentText} from './reading.js';
export function plainEnglish(data){
 if(data.readingLanguage!=='en')return [];
 const body=data.readingBody||'',notes=[];
 if(/register|registration/i.test(body)&&/Campus Portal/i.test(body)&&/university account/i.test(body))notes.push('Register in the Campus Portal using your university account.');
 const choice=body.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s+or\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})/i);
 if(choice&&/register|deadline/i.test(body))notes.push('Some registration deadlines are '+choice[2]+' or '+choice[3]+' '+choice[1]+' '+choice[4]+'. Check which one applies to your module.');
 if(/attached list|attached schedule/i.test(body)&&/registration|withdrawal/i.test(body))notes.push('Check the attached timetable for your module’s registration and withdrawal dates. Campus Post has not read the attachment.');
 if(/examination number/i.test(body)&&/study plan/i.test(body))notes.push('Use your valid study plan to find the correct examination number before registering.');
 if(/special registration process/i.test(body))notes.push('Some modules have a different registration process; check the course instructions.');
 for(const event of data.events||[])if(event.warnings.some(w=>w.startsWith('Administrative examination date')))notes.push(event.startDate+' is an administrative examination date. The actual assessment date may differ; check your course.');
 if(/withdrawal is possible until four days before/i.test(body)&&/no examination and withdrawal date/i.test(body))notes.push('For the written exams described here, withdrawal is possible until four days before the exam. The actual exam date is still needed to work out that deadline.');
 return notes;
}
// Facts are extracted from the message, never invented by a language model.
export function overviewFacts(mail,data){
 const lines=sentences(data.readingBody??currentText(mail.body||''));
 const action=/\b(?:please|must|register|registration|book|booking|submit|reply|respond|confirm|attend|bring|complete|apply|upload|pay|deadline|deregister|cancel|bitte|anmelden|anmeldung|abmelden|abmeldung|buchen|einreichen|abgeben|antworten|bestätigen|mitbringen|bewerben|hochladen|bezahlen|frist)\b|müssen|spätestens/i;
 const footer=/unsubscribe|mailing list|verteiler|leave@|no-reply|do not reply|nicht antworten/i;
 const tidy=line=>line.replace(/\s*<https?:[^>\s]+>/g,'').replace(/\s*\[(?:https?:|cid:)[^\]\s]+\]/g,'').replace(/^\p{Ll}/u,c=>c.toUpperCase()).trim();
 return {actions:data.needsTranslation?[]:[...new Set(lines.filter(line=>action.test(line)&&!footer.test(line)&&!/manage your (?:email )?preferences|click here to/i.test(line)).map(tidy))],points:data.summary||[],eligibility:data.eligibility||[],dates:data.events||[]};
}
