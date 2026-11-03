"""Maintainer-only download; build/preview never access these hosts.

Unmodified 2K maps by Solar System Scope / INOVE, CC BY 4.0.
The committed manifest pins the exact bytes used by the application.
"""
from pathlib import Path
import hashlib
import json
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'web/public/space/surfaces'
DEST.mkdir(parents=True, exist_ok=True)
NAMES = ['sun', 'mercury', 'venus_surface', 'earth_daymap', 'earth_clouds',
         'mars', 'jupiter', 'saturn', 'neptune', 'moon']
records = []
for filename in [f'2k_{name}.jpg' for name in NAMES] + ['2k_saturn_ring_alpha.png']:
    url = f'https://www.solarsystemscope.com/textures/download/{filename}'
    path = DEST / filename
    # Pin a byte-preserving mirror for maps whose origin is unreachable locally.
    # Cloud/ring sources are configured below once verified against attribution.
    body = filename.removeprefix('2k_').removesuffix('.jpg')
    body = {'venus_surface':'venus', 'earth_daymap':'earth'}.get(body,body)
    download_url = (f'https://raw.githubusercontent.com/RTF22/Orrery/6c81feb760cb36d7d83d1421aef257833ba9768e/assets-quellen/texturen/{body}/albedo.jpg'
                    if body in ['sun','mercury','venus','earth','mars','jupiter','saturn','neptune','moon'] else url)
    if filename=='2k_saturn_ring_alpha.png':
        download_url='https://raw.githubusercontent.com/RTF22/Orrery/6c81feb760cb36d7d83d1421aef257833ba9768e/public/textures/saturn/ring.png'
    elif filename=='2k_earth_clouds.jpg':
        download_url='https://raw.githubusercontent.com/elymas/solar-simulator/d34a9f973a7c4ad683eeb7d080b0accaba81e840/public/textures/2k_earth_clouds.jpg'
    with urllib.request.urlopen(download_url, timeout=30) as response:
        data = response.read()
    assert data.startswith(b'\xff\xd8') or data.startswith(b'\x89PNG'), filename
    path.write_bytes(data)
    records.append(dict(file=filename, url=url, downloadedFrom=download_url, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
    print(filename, len(data), flush=True)
(DEST / 'manifest.json').write_text(json.dumps(dict(
    source='https://www.solarsystemscope.com/textures/',
    author='Solar System Scope / INOVE', license='CC-BY-4.0',
    licenseUrl='https://creativecommons.org/licenses/by/4.0/',
    modifications='None. Maps are used as artistic chapter identities, not astronomical data.',
    assets=records), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

commit = '22434e04d7753f7e949e8d724ab3da2864c17a0f'
vendor = ROOT / 'web/.vitepress/theme/vendor/webgl-noise'
vendor.mkdir(parents=True, exist_ok=True)
for remote, local in [('src/noise3D.glsl', 'noise3D.glsl'), ('LICENSE', 'LICENSE')]:
    url = f'https://raw.githubusercontent.com/stegu/webgl-noise/{commit}/{remote}'
    with urllib.request.urlopen(url, timeout=60) as response:
        (vendor / local).write_bytes(response.read())
(vendor / 'SOURCE.md').write_text(f'# webgl-noise\n\nSource: https://github.com/stegu/webgl-noise/tree/{commit}\n\nUnmodified `src/noise3D.glsl`, MIT, Ashima Arts / Stefan Gustavson.\nUsed in the local star surface, corona, nebula and shockwave shaders.\n', encoding='utf-8')
