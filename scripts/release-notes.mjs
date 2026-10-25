// Prints the CHANGELOG section for one version (used as GitHub release notes).
import fs from 'node:fs/promises';
const version=(process.argv[2]||'').replace(/^v/,'');
const text=await fs.readFile('CHANGELOG.md','utf8');
const sections=text.split(/^## /m).slice(1);
const section=sections.find(s=>s.startsWith(version+' '));
if(!section)throw Error('CHANGELOG.md has no section for '+version);
console.log(section.split('\n').slice(1).join('\n').trim()+'\n\nInstall: download the ZIP below, extract it into a permanent folder and load it unpacked. Existing users: copy the files over the same folder, then click Reload on the Extensions page. Verify the download with SHA256SUMS.txt.');
