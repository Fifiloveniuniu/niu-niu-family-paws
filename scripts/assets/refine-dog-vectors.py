"""Build detail-preserving vector dog assets. Requires svgpathtools."""
from pathlib import Path
from copy import deepcopy
import math
import xml.etree.ElementTree as E
from svgpathtools import parse_path, CubicBezier
N = 'http://www.w3.org/2000/svg'
E.register_namespace('', N)
T = lambda s: '{' + N + '}' + s
base = Path('public/images/marketing')
root = E.parse(base / 'logo-transparent.svg').getroot()
def find(id):
    return next(e for e in root.iter() if e.get('id') == id)
# Align only small tangent discontinuities; retain each original handle length.
# Shortening every handle flattened the fine shading shapes in the first pass.
count = 0
for element in find('refined-source-fur-vectors'):
    if element.tag != T('path'):
        continue
    curve = parse_path(element.get('d'))
    changed = False
    for a, b in zip(curve, list(curve)[1:]):
        if not isinstance(a, CubicBezier) or not isinstance(b, CubicBezier) or abs(a.end - b.start) > 1e-6:
            continue
        u, v = a.end - a.control2, b.control1 - b.start
        if min(abs(u), abs(v)) < 1e-5:
            continue
        cosine = (u.real * v.real + u.imag * v.imag) / (abs(u) * abs(v))
        if cosine < math.cos(math.radians(25)):
            continue
        direction = u / abs(u) + v / abs(v)
        direction /= abs(direction)
        ca, cb = a.end - direction * abs(u), b.start + direction * abs(v)
        # Bound visual displacement in source units, preserving tapered locks.
        if max(abs(ca - a.control2), abs(cb - b.control1)) > .22:
            continue
        a.control2, b.control1 = ca, cb
        count += 1
        changed = True
    if changed:
        element.set('d', curve.d())
art = find('dog-artwork')
# The full source already includes all ten anatomical components. The old
# foundation plus ten overlapping masked copies painted many boundaries twice.
wrapper = art[0]
for child in list(wrapper):
    if child.get('id') != 'refined-dog-foundation':
        wrapper.remove(child)
# Restore source bow folds, glossy nose, iris shading and tongue texture.
# Designed replacements covered rather than replaced those detailed shapes.
for child in list(art):
    if child is not wrapper:
        art.remove(child)
# Replace the traced eyes within their visible apertures, preserving source
# fur over the eyes. Base, pupils and catchlights are actual SVG circles.
defs = root.find(T('defs'))
eye_mask = deepcopy(find('refined-dog-eyes-mask'))
eye_mask.set('id', 'circular-eye-apertures')
defs.append(eye_mask)
grad = E.SubElement(defs, T('radialGradient'), {'id':'circular-eye-iris','cx':'42%','cy':'32%','r':'72%'})
for offset, color in [('0%','#58361e'),('65%','#30190e'),('100%','#160d08')]:
    E.SubElement(grad,T('stop'),{'offset':offset,'stop-color':color})
eyes = E.SubElement(art,T('g'),{'id':'circular-eyes','mask':'url(#circular-eye-apertures)'})
for side,cx,cy,hx,hy in [('left',532,421,543,407),('right',719,424,731,409)]:
    group=E.SubElement(eyes,T('g'),{'id':side+'-circular-eye'})
    E.SubElement(group,T('circle'),{'cx':str(cx),'cy':str(cy),'r':'36','fill':'url(#circular-eye-iris)','stroke':'#23140c','stroke-width':'2'})
    E.SubElement(group,T('circle'),{'cx':str(cx+1),'cy':str(cy-2),'r':'27','fill':'#170b06'})
    # Narrow tapered reflection stays inside the iris; no second eye outline.
    d=f'M{cx-28} {cy-7} Q{cx-31} {cy+12} {cx-18} {cy+25} Q{cx-25} {cy+9} {cx-25} {cy-5}Z'
    E.SubElement(group,T('path'),{'d':d,'fill':'#c6b5a0'})
    E.SubElement(group,T('circle'),{'cx':str(hx),'cy':str(hy),'r':'6.7','fill':'#fffdf6'})

root.set('width', '1254')
root.set('height', '1254')
find('description').text = 'Detailed vector logo with one dog rendering, preserved fur and facial shading, and gently smoothed curves. Transparent outside the cream badge.'
(base / 'logo-refined.svg').write_bytes(E.tostring(root, encoding='utf-8', xml_declaration=True))
dog = E.Element(T('svg'), {'width': '1600', 'height': '1600', 'viewBox': '280 90 680 650', 'role': 'img', 'aria-label': 'Detailed Niu Niu vector dog'})
E.SubElement(dog, T('title')).text = 'Niu Niu dog — detailed clean vector'
dog.append(deepcopy(root.find(T('defs'))))
dog.append(deepcopy(art))
# Remove only the badge strip beneath the beard; keep the original paw shapes.
mask = next(e for e in dog.iter() if e.get('id') == 'dog-banner-cleanup')
E.SubElement(mask, T('path'), {'d': 'M574 671 Q625 679 684 671 V725 H574Z', 'fill': 'black'})
(base / 'dog-head-refined.svg').write_bytes(E.tostring(dog, encoding='utf-8', xml_declaration=True))
print(f'Preserved detail; gently aligned {count} joins; one visible source instance per dog.')
