"""
Convert the polygon editor JSON (with quadratic Bézier sides) into discrete
[x, y] arrays ready to paste into lore-galaxy.component.ts.
"""
import json
from pathlib import Path

SRC = Path('/tmp/seg/user-segmenta.json')
SAMPLES = 24  # points par courbe Bézier


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
    data = json.loads(SRC.read_text())
    for name, verts in data['segmenta'].items():
        poly = to_polygon(verts)
        # Format ts : [[x,y],[x,y],...]  inline compact.
        flat = ','.join(f'[{p[0]},{p[1]}]' for p in poly)
        print(f'\n// {name}: {len(poly)} points')
        print(f'polygon: [{flat}]')


if __name__ == '__main__':
    main()
