import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import vm from 'node:vm';
const m=JSON.parse(await fs.readFile('extension/manifest.json','utf8'));
assert.deepEqual(m.permissions,['storage']);assert.deepEqual(m.host_permissions,['https://webmail.tu-ilmenau.de/*']);
assert.equal(m.version,JSON.parse(await fs.readFile('package.json','utf8')).version);
for(const f of [...m.content_scripts[0].js,m.background.service_worker,'dashboard.html','dashboard.js','core.js','SETUP.md',...Object.values(m.icons)])assert.ok((await fs.stat('extension/'+f)).size>0);
let clicked,listener;const sent=[],opened=[];
const chrome={action:{onClicked:{addListener:f=>clicked=f}},tabs:{sendMessage:async(...a)=>sent.push(a),create:async a=>opened.push(a)},runtime:{id:'fixture',onMessage:{addListener:f=>listener=f}}};
vm.runInNewContext(await fs.readFile('extension/background.js','utf8'),{chrome});
await clicked({id:77,url:'https://webmail.tu-ilmenau.de/?_task=mail'});assert.equal(sent[0][1].type,'campus-popup-toggle');assert.equal(opened.length,0);
await clicked({id:3,url:'https://example.invalid/'});assert.equal(opened[0].url,'https://webmail.tu-ilmenau.de/');
assert.equal(m.commands?._execute_action?.suggested_key?.default,'Alt+Shift+M','toolbar shortcut declared without new permissions');
for(const f of ['extension/dashboard.html','extension/privacy.html','extension/support.html','docs/INSTALL.md','README.md'])assert.ok((await fs.readFile(f,'utf8')).includes(m.version),f+' shows the current version');
assert.match(await fs.readFile('CHANGELOG.md','utf8'),new RegExp('^## '+m.version.replace(/\./g,'\\.')+' ','m'),'CHANGELOG has a section for this version');
assert.doesNotMatch(await fs.readFile('CHANGELOG.md','utf8'),/â€/,'CHANGELOG is valid UTF-8 text');
// Packaging twice must give byte-identical archives so published checksums are verifiable.
const {spawnSync}=await import('node:child_process');
const python=['python3','python'].find(cmd=>spawnSync(cmd,['--version']).status===0);
if(python){const sums=[];for(let i=0;i<2;i++){const r=spawnSync(python,['scripts/package.py'],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);sums.push(await fs.readFile('dist/SHA256SUMS.txt','utf8'));await new Promise(resolve=>setTimeout(resolve,1100));}assert.equal(sums[0],sums[1],'reproducible ZIP');}
else console.log('Python not found; skipped reproducible ZIP check.');
console.log('Manifest, version labels, shortcut, popup routing and reproducible packaging tests passed');
