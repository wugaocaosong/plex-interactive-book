"""Verify vendored input models; --download reconstructs them from pinned upstreams."""
import argparse, gzip, hashlib, io, json, pathlib, tarfile, urllib.request, zipfile

root = pathlib.Path(__file__).resolve().parents[1] / 'content/input-models'
manifest = json.loads((root / 'manifest.json').read_text(encoding='utf-8'))
parser = argparse.ArgumentParser()
parser.add_argument('--download', action='store_true')
args = parser.parse_args()
for asset in manifest['assets']:
    path = root / asset['file']
    if args.download:
        raw = urllib.request.urlopen(asset['url'], timeout=180).read()
        if hashlib.sha256(raw).hexdigest() != asset['upstreamSha256']:
            raise SystemExit('Upstream checksum mismatch: ' + asset['file'])
        if asset['file'].endswith('.tar.gz'):
            with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                files = {n: archive.read(n) for n in archive.namelist() if not n.endswith('/')}
            directories = set()
            for name in files:
                parts = name.split('/')
                for i in range(1, len(parts)):
                    directories.add('/'.join(parts[:i]))
            output = io.BytesIO()
            with gzip.GzipFile(fileobj=output, mode='wb', mtime=0) as gz:
                with tarfile.open(fileobj=gz, mode='w', format=tarfile.USTAR_FORMAT) as bundle:
                    for name in sorted(directories):
                        info = tarfile.TarInfo(name + '/')
                        info.type, info.mode, info.mtime = tarfile.DIRTYPE, 0o755, 1577836800
                        bundle.addfile(info)
                    for name, data in sorted(files.items()):
                        info = tarfile.TarInfo(name)
                        info.size, info.mode, info.mtime = len(data), 0o644, 1577836800
                        bundle.addfile(info, io.BytesIO(data))
            raw = output.getvalue()
        if hashlib.sha256(raw).hexdigest() != asset['sha256']:
            raise SystemExit('Repacked checksum mismatch: ' + asset['file'])
        path.write_bytes(raw)
    if hashlib.sha256(path.read_bytes()).hexdigest() != asset['sha256']:
        raise SystemExit('Local checksum mismatch: ' + asset['file'])
    print('Verified ' + asset['file'])
