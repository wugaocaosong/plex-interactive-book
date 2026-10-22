"""Package tracked sources and a freshly built static site, excluding machine state."""
import datetime, hashlib, json, pathlib, subprocess, zipfile

ROOT=pathlib.Path(__file__).resolve().parents[1]
DIST=ROOT/'web/.vitepress/dist'
if subprocess.check_output(['git','status','--porcelain'],cwd=ROOT,text=True).strip():
    raise SystemExit('Commit source/document changes before packaging so the manifest identifies the exact inputs.')
if not (DIST/'index.html').is_file():raise SystemExit('Run npm run build before packaging.')
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
tracked=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode('utf8').split('\0')
files={name:ROOT/name for name in tracked if name and (ROOT/name).is_file()}
files.update({p.relative_to(ROOT).as_posix():p for p in DIST.rglob('*') if p.is_file()})
manifest={'applicationCommit':commit,'formatVersion':1,'files':{name:{'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size} for name,path in sorted(files.items())}}
timestamp=int(subprocess.check_output(['git','show','-s','--format=%ct','HEAD'],cwd=ROOT,text=True))
ziptime=datetime.datetime.fromtimestamp(timestamp,datetime.timezone.utc).timetuple()[:6]
version=json.loads((ROOT/'package.json').read_text(encoding='utf8'))['version']
output=ROOT/'output/releases';output.mkdir(parents=True,exist_ok=True)
archive=output/f'plex-interactive-book-v{version}-{commit[:7]}.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as bundle:
    def add(name,data):
        entry=zipfile.ZipInfo('plex-interactive-book/'+name,date_time=ziptime)
        entry.compress_type=zipfile.ZIP_DEFLATED
        entry.external_attr=0o644 << 16
        bundle.writestr(entry,data)
    for name,path in sorted(files.items()):add(name,path.read_bytes())
    add('PACKAGE-MANIFEST.json',(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n').encode('utf8'))
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
checksum=archive.with_suffix('.zip.sha256')
checksum.write_text(f'{digest}  {archive.name}\n',encoding='utf8',newline='\n')
print(json.dumps({'archive':str(archive),'files':len(files)+1,'bytes':archive.stat().st_size,'sha256':digest},ensure_ascii=False))
