const two=n=>String(n).padStart(2,'0');
function clock(h,m,period){h=Number(h);if(/p/i.test(period)&&h<12)h+=12;if(/a/i.test(period)&&h===12)h=0;return h<24?two(h)+':'+two(m||0):'';}
export function sourceClocks(text){
 let m=text.match(/\b(?:zwischen|von)\s+(\d{1,2})(?::(\d{2}))?\s+(?:und|bis)\s*(\d{1,2})(?::(\d{2}))?/i);
 if(m&&/:\d{2}|Uhr/i.test(text))return {start:clock(m[1],m[2],''),end:clock(m[3],m[4],'')};
 m=text.match(/\bfrom\s+(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)/i);
 if(m)return {start:clock(m[1],m[2],m[3]||m[6]),end:clock(m[4],m[5],m[6])};
 m=text.match(/\b(?:at|um|ab)\s+(\d{1,2})(?:[:.](\d{2}))?\s*([ap]\.?m\.?|Uhr)/i);if(m)return {start:clock(m[1],m[2],m[3]),end:''};
 return null;
}
