// Usage: npm run version -- 0.3.7
// Updates every user-visible version string so a release cannot ship mismatched labels.
import fs from 'node:fs/promises';
const next=process.argv[2];
if(!/^\d+\.\d+\.\d+$/.test(next||''))throw Error('Pass a version such as 0.3.7');
const pkg=JSON.parse(await fs.readFile('package.json','utf8')),previous=pkg.version;
const files=['package.json','package-lock.json','extension/manifest.json','extension/dashboard.html','extension/privacy.html','extension/support.html','docs/INSTALL.md','README.md'];
for(const file of files){
 let text=await fs.readFile(file,'utf8');
 if(file==='package-lock.json'){const lock=JSON.parse(text);lock.version=next;lock.packages[''].version=next;text=JSON.stringify(lock,null,2)+'\n';}
 else text=text.split(previous).join(next);
 await fs.writeFile(file,text);
}
console.log(`Version ${previous} → ${next}. Add a CHANGELOG entry, then run npm run build.`);
