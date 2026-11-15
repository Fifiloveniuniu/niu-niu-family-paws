#!/usr/bin/env python3
"""Collect licensed Wikimedia pet photographs; no business records are changed."""
import argparse, concurrent.futures, hashlib, html, json, re, time
from collections import Counter
from pathlib import Path
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

AGENT = 'FamilyPawsTestPhotoLibrary/1.0 (https://github.com/Fifiloveniuniu/niu-niu-family-paws; licensed test assets)'
API = 'https://commons.wikimedia.org/w/api.php'
LICENSES = {'CC0', 'CC BY 2.0', 'CC BY 2.5', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 2.5', 'CC BY-SA 3.0', 'CC BY-SA 4.0'}

def get(url):
    for attempt in range(5):
        try:
            with urlopen(Request(url, headers={'User-Agent': AGENT}), timeout=45) as response:
                if int(response.headers.get('Content-Length', '0')) > 20_000_000:
                    raise ValueError('Image too large')
                data = response.read(20_000_001)
                if len(data) > 20_000_000:
                    raise ValueError('Image too large')
                return data
        except Exception:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)

def clean(value):
    return html.unescape(re.sub('<[^>]*>', '', value)).strip()

def bare(url):
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, parts.path, '', ''))

def collect(species, count, out):
    folder = out / species
    folder.mkdir(parents=True, exist_ok=True)
    manifest = folder / 'sources.json'
    entries = json.loads(manifest.read_text()) if manifest.exists() else []
    creator_counts = Counter(entry['creator'] for entry in entries)
    seen = {entry['pageId'] for entry in entries}
    hashes = {entry['sourceSha256'] for entry in entries}
    queries = {
        'cat': ['Portrait photographs of cats', 'Pet cats'],
        'dog': ['Portrait photographs of dogs', 'Pet dogs'],
        'rabbit': ['Pet rabbits', 'Domesticated rabbits', 'Holland Lop', 'Mini Rex'],
    }[species]
    excluded = re.compile(r'\b(cartoon|drawing|painting|sculpture|statue|skeleton|taxiderm|dead|carcass|myxomatosis|animal-hoarding|butcher|slaughter|disease|wound|surgery|medical|roadkill|hot dog|dog tag|cat scan|rabbitfish|illustration|clipart|radiography|dewclaw|waterfall|water wheel|sno-cat|cat ba|canon cat|cat snake|sand cat|cat and flowers|black cat roundabout|artwork|paintings|sculptures|drawings|postcards|cartoons|textiles|coaster|train|jessica|plate|royal doulton)\b', re.I)
    for query in queries:
        continuation = None
        for offset in range(0, 700, 50):
            if len(entries) >= count:
                break
            if offset and not continuation:
                break
            params = dict(action='query', format='json', generator='categorymembers', gcmtitle='Category:' + query, gcmtype='file', gcmlimit=50, prop='imageinfo', iiprop='url|extmetadata|mime|size', iiurlwidth=640)
            if continuation:
                params['gcmcontinue'] = continuation
            response = json.loads(get(API + '?' + urlencode(params)))
            continuation = response.get('continue', {}).get('gcmcontinue')
            if 'error' in response:
                raise RuntimeError(response['error']['code'])
            pages = sorted(response.get('query', {}).get('pages', {}).values(), key=lambda page: page.get('index', 0))
            if not pages:
                break
            candidates = []
            for page in pages:
                info = page.get('imageinfo', [{}])[0]
                metadata = info.get('extmetadata', {})
                field = lambda name: clean(str(metadata.get(name, {}).get('value', '')))
                license_name = field('LicenseShortName')
                if page['pageid'] in seen or info.get('mime') != 'image/jpeg' or license_name not in LICENSES:
                    continue
                if min(info.get('width', 0), info.get('height', 0)) < 300 or excluded.search(page['title'] + ' ' + field('ImageDescription') + ' ' + field('Categories')):
                    continue
                if not field('Artist') or not field('LicenseUrl') or field('Restrictions') or creator_counts[field('Artist')] >= 8:
                    continue
                candidates.append((page, info, field('Artist'), license_name, field('LicenseUrl')))
            def download(candidate):
                page, info, artist, license_name, license_url = candidate
                url = bare(info.get('thumburl', info['url']))
                try:
                    cached = folder / (str(page['pageid']) + '.jpg')
                    data = cached.read_bytes() if cached.exists() else get(url)
                    if not data.startswith(b'\xff\xd8\xff'):
                        return None
                    digest = hashlib.sha256(data).hexdigest()
                    return dict(pageId=page['pageid'], species=species, title=page['title'], creator=artist, license=license_name, licenseUrl=license_url, sourcePage=info['descriptionurl'], sourceImage=bare(info['url']), downloadedFrom=url, sourceSha256=digest, testOnly=True), data
                except Exception as error:
                    print(f'{species}: skipped {page["pageid"]} ({type(error).__name__})', flush=True)
                    return None
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
                for result in pool.map(download, candidates[:count-len(entries)]):
                    if not result:
                        continue
                    entry, data = result
                    if entry['sourceSha256'] in hashes or creator_counts[entry['creator']] >= 8:
                        continue
                    filename = str(entry['pageId']) + '.jpg'
                    (folder / filename).write_bytes(data)
                    entry['localFile'] = species + '/' + filename
                    entries.append(entry)
                    creator_counts[entry['creator']] += 1
                    seen.add(entry['pageId'])
                    hashes.add(entry['sourceSha256'])
                    manifest.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
            print(f'{species}: {len(entries)}/{count}', flush=True)
            time.sleep(1)
        if len(entries) >= count:
            break
    if len(entries) < count:
        raise RuntimeError(f'Only {len(entries)} eligible {species} photos found')
    return entries[:count]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--per-species', default=100, type=int)
    args = parser.parse_args()
    if not 1 <= args.per_species <= 300:
        parser.error('--per-species must be between 1 and 300')
    entries = []
    for species in ('cat', 'dog', 'rabbit'):
        entries.extend(collect(species, args.per_species, args.output))
    (args.output / 'sources.json').write_text(json.dumps(entries, ensure_ascii=False, indent=2) + '\n')
    print(f'Collected {len(entries)} licensed source images. Review contact sheets before upload.', flush=True)

if __name__ == '__main__':
    main()
