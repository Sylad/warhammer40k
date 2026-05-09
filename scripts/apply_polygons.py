"""
Patch lore-galaxy.component.ts : replace each Segmentum's polygon: [[...]]
line with the new sampled polygon from the Bezier editor JSON.
"""
import json
import re
from pathlib import Path

JSON = Path('/tmp/seg/user-segmenta.json')
TS = Path('/home/sylvain_ladoire/projects/developpeur/warhammer40k/frontend/src/app/features/lore-galaxy/lore-galaxy.component.ts')
SAMPLES = 24


def bezier_quad(p0, p1, p2, n):
    out = []
    for i in range(1, n + 1):
        t = i / (n + 1)
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        out.append([round(x), round(y)])
    return out


def to_polygon(verts):
    n = len(verts)
    out = []
    for i in range(n):
        cur = verts[i]
        nxt = verts[(i + 1) % n]
        out.append([round(cur['x']), round(cur['y'])])
        if 'bezier' in cur:
            out.extend(bezier_quad(
                (cur['x'], cur['y']),
                (cur['bezier']['ax'], cur['bezier']['ay']),
                (nxt['x'], nxt['y']),
                SAMPLES,
            ))
    return out


def main():
    data = json.loads(JSON.read_text())
    text = TS.read_text(encoding='utf-8')
    for name, verts in data['segmenta'].items():
        poly = to_polygon(verts)
        flat = ','.join(f'[{p[0]},{p[1]}]' for p in poly)
        new_line = f'polygon: [{flat}]'
        # Match `{ id: 'name', ..., polygon: [[...]] }` capturing the polygon part.
        pattern = re.compile(
            r"(\{ id: '" + re.escape(name) + r"',[^}]*?)polygon: \[[^\]]*?\]\]",
            re.DOTALL,
        )
        before = text
        text, n = pattern.subn(lambda m: m.group(1) + new_line, text, count=1)
        if n != 1:
            # Cas où le polygon est sur plusieurs lignes : pattern alternative.
            pattern2 = re.compile(
                r"(\{ id: '" + re.escape(name) + r"',[^}]*?\bpolygon:\s*)\[\[.*?\]\]",
                re.DOTALL,
            )
            text, n = pattern2.subn(lambda m: m.group(1) + f'[{flat}]', text, count=1)
        print(f'  {name:10s} -> {len(poly)} pts  ({"replaced" if n else "NO MATCH"})')
    TS.write_text(text, encoding='utf-8')
    print(f'\nWritten : {TS}')


if __name__ == '__main__':
    main()
