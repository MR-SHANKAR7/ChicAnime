import json, re, shutil
from pathlib import Path
from html import escape
from urllib.request import urlopen
from urllib.parse import quote, urlparse
import xml.etree.ElementTree as ET

BASE = 'https://mr-shankar7.github.io/ChicAnime'
OUT = Path('_site')
def text(value):
    return re.sub(r'<[^>]*>', '', str(value or '')).strip()
def esc(value):
    return escape(str(value or ''), quote=True)
def url(value):
    value = str(value or '')
    return value if urlparse(value).scheme in ('https', 'http') else ''
def load(endpoint):
    with urlopen(endpoint, timeout=60) as response:
        data = json.load(response)
    if not isinstance(data, dict) or not data:
        raise RuntimeError('Missing public content: ' + endpoint)
    return [(str(k), v) for k, v in data.items() if isinstance(v, dict)]
def page(title, description, canonical, body, schema):
    structured = json.dumps(schema, ensure_ascii=False).replace('<', '\u003c')
    return f'''<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)} | ChicAnime</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{esc(canonical)}"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{esc(canonical)}"><meta property="og:type" content="website"><script type="application/ld+json">{structured}</script><style>body{{font:18px/1.9 system-ui;background:#101422;color:#eee;max-width:1000px;margin:auto;padding:24px}}a{{color:#8fcdff}}img{{max-width:100%;max-height:480px;object-fit:contain}}article{{white-space:pre-line}}li{{margin:12px 0}}nav{{margin-bottom:24px}}</style></head><body><nav><a href="{BASE}/">الرئيسية</a> · <a href="{BASE}/seo/">دليل الأنمي والأخبار</a></nav><main><h1>{esc(title)}</h1>{body}</main></body></html>'''
def write(path, content):
    target = OUT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')

anime = load('https://anime-studio-videos-default-rtdb.firebaseio.com/anime.json')
news = load('https://anime-gallery-b0a34-default-rtdb.firebaseio.com/news.json')
if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir()
for item in Path('.').iterdir():
    if item.name in {'automation', '_site', '.github'} or item.name.startswith('.'):
        continue
    if item.is_dir():
        shutil.copytree(item, OUT / item.name)
    else:
        shutil.copy2(item, OUT / item.name)

links = []
locations = [BASE + '/', BASE + '/seo/']
for kind, records in [('anime', anime), ('news', news)]:
    for key, record in records:
        title = text(record.get('title_ar') or record.get('title'))
        content = text(record.get('description') if kind == 'anime' else record.get('content') or record.get('excerpt'))
        if not title or not content:
            continue
        safe_key = quote(key, safe='')
        path = f'seo/{kind}/{safe_key}/index.html'
        canonical = f'{BASE}/seo/{kind}/{safe_key}/'
        image = url(record.get('thumbnail') if kind == 'anime' else record.get('imageUrl'))
        body = f'<img src="{esc(image)}" alt="{esc(title)}" loading="lazy">' if image else ''
        body += '<article>' + esc(content) + '</article>'
        schema = {'@context': 'https://schema.org', '@type': 'TVSeries' if kind == 'anime' else 'NewsArticle', 'name': title, 'description': content[:300], 'url': canonical, 'inLanguage': 'ar'}
        if image:
            schema['image'] = image
        if kind == 'anime':
            body += f'<p><a href="{BASE}/anime.html?id={safe_key}">تفاصيل الأنمي والحلقات في الموقع</a></p>'
        else:
            schema['headline'] = title
            date = str(record.get('date') or '')
            if re.match(r'^\d{4}-\d{2}-\d{2}', date):
                schema['datePublished'] = date
            source = url(record.get('sourceUrl'))
            if source:
                body += f'<p>المصدر: <a href="{esc(source)}" rel="noopener noreferrer">{esc(record.get("source") or "المصدر الأصلي")}</a></p>'
        write(path, page(title, content[:160], canonical, body, schema))
        links.append(f'<li><a href="{esc(canonical)}">{esc(title)}</a> — {"أنمي" if kind == "anime" else "خبر"}</li>')
        locations.append(canonical)
if not links:
    raise RuntimeError('No indexable pages generated')
write('seo/index.html', page('دليل الأنمي والأخبار', 'تصفح الأنميات وأخبار الأنمي بالعربية على ChicAnime.', BASE + '/seo/', '<ul>' + ''.join(links) + '</ul>', {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': 'دليل الأنمي والأخبار', 'url': BASE + '/seo/'}))
namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9'
ET.register_namespace('', namespace)
root = ET.Element('{' + namespace + '}urlset')
for location in locations:
    node = ET.SubElement(root, '{' + namespace + '}url')
    ET.SubElement(node, '{' + namespace + '}loc').text = location
ET.ElementTree(root).write(OUT / 'sitemap.xml', encoding='utf-8', xml_declaration=True)
index_path = OUT / 'index.html'
index = index_path.read_text(encoding='utf-8')
index = index.replace('</body>', f'<footer dir="rtl"><a href="{BASE}/seo/">دليل الأنمي والأخبار</a></footer></body>')
index_path.write_text(index, encoding='utf-8')
write('.nojekyll', '')
print(f'Generated {len(links)} static content pages and sitemap.xml')
