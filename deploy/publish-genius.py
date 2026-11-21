"""Publish a verified static-only release. Does not modify other sites or APIs."""
import hashlib
import os
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile

bundle = Path(sys.argv[1]).resolve()
expected = sys.argv[2].lower()
if hashlib.sha256(bundle.read_bytes()).hexdigest() != expected:
    raise SystemExit("Bundle SHA-256 mismatch")
site = Path('/www/wwwroot/genius.wuyeni.cn')
stage = Path('/www/server/genius-releases') / expected[:16]
stage.mkdir(parents=True, exist_ok=True)
with tarfile.open(str(bundle)) as archive:
    for member in archive.getmembers():
        relative = PurePosixPath(member.name)
        if relative.is_absolute() or '..' in relative.parts or member.issym() or member.islnk():
            raise SystemExit('Unsafe archive entry')
        if member.isdir():
            continue
        if not member.isfile() or any(p.startswith('.') for p in relative.parts):
            raise SystemExit('Unexpected archive entry')
        target = stage.joinpath(*relative.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        with archive.extractfile(member) as source, target.open('wb') as dest:
            shutil.copyfileobj(source, dest)
if not (stage / 'index.html').is_file() or not (stage / 'book/manifest.json').is_file():
    raise SystemExit('Incomplete static build')
files = sorted((p for p in stage.rglob('*') if p.is_file()), key=lambda p: p.name == 'index.html')
for source in files:
    target = site / source.relative_to(stage)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + '.next')
    shutil.copyfile(str(source), str(temporary))
    os.chmod(str(temporary), 0o644)
    os.replace(str(temporary), str(target))
print('Published {} static files; SHA-256 {}'.format(len(files), expected))
