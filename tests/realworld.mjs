// Fictional reproductions of layouts seen in real university mail (no real content).
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {analyze,readingText} from '../src/core.mjs';
const sent='2026-06-22T10:00:00+02:00',now=new Date('2026-06-22T12:00:00Z');
const events=body=>analyze({subject:'Notice',received:sent,body},now).events.map(e=>[e.startDate,e.startTime,e.endTime]);

// Clock times written with a dot are not dates.
assert.deepEqual(events('Am 29.06 um 17.00 Uhr findet der nächste Vortrag statt.'),[['2026-06-29','17:00','']]);
assert.deepEqual(events('Der Kurs ist am 30.06. von 9.30 bis 11.00 Uhr.')[0].slice(0,2),['2026-06-30','09:30']);
// Decimal durations and version numbers are not dates.
assert.deepEqual(events('* Duration: 1.5 - 2 hours\n* Compensation: 20€'),[]);
assert.deepEqual(events('Browser: AppleWebKit/605.1.15 Version/26.6.1 Safari/605.1.15'),[]);
// German weekday in parentheses does not create a second, wrong date.
assert.deepEqual(events('* Termin: 07.07.2026 (Dienstag)'),[['2026-07-07','','']]);
// English time ranges with dots or a shared p.m.
assert.deepEqual(events('Workshop | June 30 | 4 - 5.30 p.m. | Registration'),[['2026-06-30','16:00','17:30']]);
assert.deepEqual(events('Info evening | July 2 | 6.30 - 8 p.m.'),[['2026-07-02','18:30','20:00']]);
// German day.month. followed by a comma and hour ranges.
const sept=b=>analyze({subject:'Club',received:'2026-09-02T10:00:00+02:00',body:b},new Date('2026-09-02T12:00:00Z')).events;
assert.deepEqual(sept('Am Samstag, 5.9., 14-18 Uhr.').map(e=>[e.startDate,e.startTime,e.endTime]),[['2026-09-05','14:00','18:00']]);
assert.deepEqual(sept('Stammtisch: Dienstag, 8.9., 18:30 Uhr.').map(e=>[e.startDate,e.startTime]),[['2026-09-08','18:30']]);
assert.deepEqual(sept('Kosten: 1,5 Stunden'),[]);
// A weekday that contradicts the date is flagged (22.9.2026 is a Tuesday).
assert.ok(sept('Workshop: Mittwoch, 22.9., 18-21 Uhr').some(e=>e.warnings.some(w=>/Weekday conflicts/.test(w))));
assert.deepEqual(analyze({subject:'Programme',received:sent,body:'Programme vom 14.-21.04.2027 in Berlin'},now).events.map(e=>[e.startDate,e.endDate]),[['2027-04-14','2027-04-21']]);
assert.ok(analyze({subject:'Sublet: room (Nov 23 – Mar 17/30)',received:sent,body:'Room available.'},now).events.every(e=>e.startDate<'2028'),'no far-future misreading');
// One timed event per day: a date-only mention of the same day is merged.
assert.deepEqual(events('29.06: GUEST LECTURE\nAm 29.06 um 17.00 Uhr findet der Vortrag statt.'),[['2026-06-29','17:00','']]);
// Dates before the email was sent are reports, not appointments.
const past=analyze({subject:'Newsletter',received:sent,body:'In its meeting on 9 June 2026 the committee adopted the rules.'},now).events[0];
assert.ok(past.warnings.some(w=>/Historical/.test(w))&&!past.clear);
// Forum post timestamps are metadata, not events or key points.
const forum=analyze({subject:'Forum post',received:sent,body:'Course » Forums » News\nWednesday, 24 June 2026, 4:35 PM\nPlease bring your laptop to the lab session.'},now);
assert.equal(forum.events.length,0);assert.ok(!forum.summary.some(s=>/4:35 PM/.test(s)));

// Decorated "German version" markers after the English text.
const study='*** German Version Below ***\nWe are looking for participants for a study with robots. The session takes two hours and you will receive a voucher. Please sign up with the form.\nBest,\nA. Student\n/*//*/***German Version***//\nWir suchen Teilnehmer für eine Studie mit Robotern. Die Sitzung dauert zwei Stunden und Sie erhalten einen Gutschein. Bitte melden Sie sich an.';
let r=readingText(study);assert.equal(r.usesExistingEnglish,true);assert.ok(!/Wir suchen/.test(r.text));assert.match(r.text,/participants/);
// English section after a ruler that repeats the German greeting.
const bip='_____ English version below _____\nLiebe Studentin, lieber Student,\nhast du Interesse an einem intensiven Programm? Bitte bewirb dich bis zum Freitag und lade die Unterlagen hoch.\n--------------------------------------------------\nLiebe Studentin, lieber Student,\nAre you interested in a five-day intensive programme? Please apply by Friday and upload your documents to the portal. We will inform you about the selection.';
r=readingText(bip);assert.equal(r.usesExistingEnglish,true);assert.match(r.text,/Are you interested/);assert.ok(!/Liebe/.test(r.text));
// A forwarded post made only of quoted lines still has content.
r=readingText('>> Hi everyone,\n>> I am subletting my room from August. The rent is 200 EUR per month and you can contact me by phone.\n>> Best regards');
assert.equal(r.language,'en');assert.match(r.text,/subletting/);

// Key points: no greeting tails, footers or bracketed URLs; sentences split without a space.
const s=analyze({subject:'Survey',received:sent,body:'Dear colleagues,\nstaff, and students,\nplease join the survey on campus life before Friday.<https://survey.example.invalid/x>\nI lost my phone near the library.If you found it, please reply.\nIf you would like to unsubscribe or manage your email preferences click here [https://example.invalid/u]'},now).summary;
assert.ok(!s.some(x=>/^staff, and students,$/.test(x)),'greeting tail');
assert.ok(s.some(x=>x.startsWith('Please join the survey')),'capitalised continuation');
assert.ok(!s.some(x=>/<https|\[https/.test(x)),'no bracketed URLs');
assert.ok(!s.some(x=>/unsubscribe/i.test(x)),'no footer');
assert.ok(s.some(x=>x==='If you found it, please reply.'),'split "library.If"');

// Reader: Elastic header (#message-header) with ISO, German and relative dates and the sender name.
const reader=await fs.readFile('extension/reader.js','utf8');
for(const [shown,expected] of [['2026-10-16 14:58','2026-10-16T14:58'],['16.10.2026 14:58','2026-10-16T14:58']]){
 const dom=new JSDOM(`<div id="message-header"><h2 class="subject">Fictional notice</h2><span class="header-summary">Von <a class="rcmContactAddress" title="office@example.invalid">Fictional Office</a> am <span class="text-nowrap">${shown}</span></span><table><tr><td class="header date">${shown}</td></tr></table></div><div id="messagebody"><p>Please register.</p></div>`,{url:'https://webmail.tu-ilmenau.de/?_task=mail',runScripts:'outside-only'});
 const w=dom.window;Object.defineProperty(w.Element.prototype,'getClientRects',{value(){return [{}];}});
 for(const n of w.document.querySelectorAll('h2,#messagebody,#message-header'))Object.defineProperty(n,'innerText',{get(){return this.textContent;}});
 w.eval(reader);const mail=w.CampusPostReader.read();
 assert.equal(mail.received,expected);assert.equal(mail.sender,'Fictional Office');assert.equal(mail.subject,'Fictional notice');dom.window.close();
}
const rel=new JSDOM('',{runScripts:'outside-only'});rel.window.eval(reader);
assert.equal(rel.window.CampusPostReader.receivedDate('Heute 09:15',new Date(2026,9,26,12)),'2026-10-26T09:15');
assert.equal(rel.window.CampusPostReader.receivedDate('Yesterday 23:05',new Date(2026,9,26,12)),'2026-10-25T23:05');
rel.window.close();
console.log('Real-world layouts passed: dotted clock times, durations/version numbers, weekday parentheses, p.m. ranges, same-day merging, past references, forum stamps, decorated language markers, quoted-only posts, key-point clean-up and Elastic header dates/sender.');
