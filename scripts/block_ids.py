"""Persistent block identities. Registry lives outside upstream/generated content."""
import hashlib
from bs4 import BeautifulSoup


def assign_blocks(body, section, registry):
    soup = BeautifulSoup(body, 'html.parser')
    previous = registry.setdefault(section, {'blocks': [], 'aliases': {}})
    old = previous['blocks']
    blocks, used, changes = [], set(), []
    heading = ''
    tags = list(soup.find_all(recursive=False))
    for i, tag in enumerate(tags):
        retained = tag.attrs.pop('data-preserve-block', None)
        text = tag.get_text()
        if tag.name in ('h1', 'h2', 'h3', 'h4'):
            heading = text
        fingerprint = hashlib.sha256((tag.name + '\n' + text + '\n' + str(tag.get('src', ''))).encode()).hexdigest()
        candidates = [b for b in old if b['fingerprint'] == fingerprint and b['id'] not in used]
        if len(candidates) > 1:
            candidates = [b for b in candidates if b['heading'] == heading]
        if len(candidates) > 1 and blocks:
            candidates = [b for b in candidates if b.get('previous') == blocks[-1]['id']]
        if retained and retained not in used and (retained in previous['aliases'].values() or any(b['id']==retained for b in old)):
            identity = retained
        elif len(candidates) == 1:
            identity = candidates[0]['id']
        else:
            seed = f'{section}:{heading}:{fingerprint}:{i}'
            identity = 'blk-' + hashlib.sha256(seed.encode()).hexdigest()[:16]
            while identity in used or any(b['id'] == identity for b in old):
                seed += ':'
                identity = 'blk-' + hashlib.sha256(seed.encode()).hexdigest()[:16]
            changes.append({'sectionId': section, 'blockId': identity, 'reason': 'ambiguous' if candidates else 'new'})
        if not old:
            previous['aliases'][tag.get('data-block', f'b{i}')] = identity
        tag['data-block'] = identity
        used.add(identity)
        blocks.append({'id': identity, 'fingerprint': fingerprint, 'heading': heading,
                       'previous': blocks[-1]['id'] if blocks else ''})
    previous['blocks'] = blocks
    return str(soup), previous['aliases'], changes
