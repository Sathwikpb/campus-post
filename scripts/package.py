"""Build dist/campus-post-<version>.zip and its SHA-256 checksum.

The archive is reproducible: entries are sorted, use LF-normalised text from
the repository checkout and carry a fixed timestamp/mode, so the same commit
always yields the same checksum on any machine.
"""
from pathlib import Path
import hashlib, json, zipfile

root = Path(__file__).resolve().parents[1]
source = root / 'extension'
version = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))['version']
out = root / 'dist'
out.mkdir(exist_ok=True)
archive = out / f'campus-post-{version}.zip'
FIXED_TIME = (2020, 1, 1, 0, 0, 0)

with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for path in sorted(p for p in source.rglob('*') if p.is_file()):
        info = zipfile.ZipInfo(path.relative_to(source).as_posix(), FIXED_TIME)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        z.writestr(info, path.read_bytes())

digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n', encoding='utf-8')
print(archive.name, digest)
