"""
v5 — combine watershed (v4) + sliding-window classification (v3) + filtering
to exact expected segment counts per Segmentum.

Per the user's spec :
  Solar     : 5 radials + 5 arcs
  Pacificus : 2 + 2
  Tempestus : 4 + 4
  Ultima    : 6 + 6
  Obscurus  : 5 + 5

Pipeline :
  1. Build masks per color, watershed-attribute every galaxy pixel
  2. Extract clean contour of each Segmentum's final mask
  3. Sliding window walk : label each pixel as 'radial' / 'arc' / 'corner'
     based on local theta-vs-r std deviations
  4. Run-length encode → list of (label, [pixel_indices])
  5. Filter : keep the N_radial longest 'radial' runs + N_arc longest 'arc' runs.
     Re-label everything else as 'corner'.
  6. For each kept run, fit canon segment :
       radial : theta = mean atan2 of pixels, rMin/rMax = pixel range
       arc    : r = median, thetaStart/thetaEnd = pixel angular range
  7. Order segments along the contour. Output JSON.
  8. Dedup shared borders by parameter matching between neighbours.
"""
from __future__ import annotations
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SRC = Path('/home/sylvain_ladoire/projects/developpeur/downloads/galaxy-map-segmenta.jpg')
OUT = Path('/tmp/seg')
OUT.mkdir(parents=True, exist_ok=True)
TERRA = (967, 1255)

SEGMENTA = {
    'solar':     {'mask': lambda r, g, b: (r > 180) & (g > 100) & (g < 200) & (b < 120),
                  'color': (224, 160, 64), 'nRadial': 5, 'nArc': 5},
    'tempestus': {'mask': lambda r, g, b: (g > 180) & (r < 120) & (b < 120),
                  'color': (32, 224, 64), 'nRadial': 4, 'nArc': 4},
    'ultima':    {'mask': lambda r, g, b: (b > 180) & (g > 150) & (r < 200) & (r > 80),
                  'color': (128, 192, 224), 'nRadial': 6, 'nArc': 6},
    'pacificus': {'mask': lambda r, g, b: (r > 180) & (g < 60) & (b < 60),
                  'color': (224, 0, 0), 'nRadial': 2, 'nArc': 2},
    'obscurus':  {'mask': lambda r, g, b: (r > 80) & (r < 200) & (g < 60) & (b > 180),
                  'color': (128, 0, 224), 'nRadial': 5, 'nArc': 5},
}

NEIGHBOURS = [
    ('solar', 'pacificus'), ('solar', 'tempestus'), ('solar', 'ultima'), ('solar', 'obscurus'),
    ('pacificus', 'tempestus'), ('tempestus', 'ultima'),
    ('ultima', 'obscurus'), ('obscurus', 'pacificus'),
]

WINDOW = 30
RADIAL_THETA_STD_MAX = 0.9
ARC_R_STD_MAX = 5
MIN_RUN_PIXELS = 20


def keep_largest_cc(mask: np.ndarray) -> np.ndarray:
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    largest = 1 + int(np.argmax(stats[1:, 4]))
    return lbl == largest


def fill_holes(mask: np.ndarray) -> np.ndarray:
    m = mask.astype(np.uint8)
    flooded = m.copy()
    H, W = m.shape
    cv2.floodFill(flooded, np.zeros((H + 2, W + 2), np.uint8), (0, 0), 1)
    return (m | (flooded == 0).astype(np.uint8)).astype(bool)


def clean_mask(mask: np.ndarray, k: int = 15) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    return fill_holes(m.astype(bool))


def to_polar(x: float, y: float) -> tuple[float, float]:
    dx, dy = x - TERRA[0], y - TERRA[1]
    return (math.degrees(math.atan2(dy, dx)) + 360) % 360, math.hypot(dx, dy)


def circular_std(thetas: np.ndarray) -> float:
    if len(thetas) < 2:
        return 0.0
    rad = np.radians(thetas)
    R = math.hypot(np.mean(np.sin(rad)), np.mean(np.cos(rad)))
    R = max(min(R, 1.0), 1e-12)
    return math.degrees(math.sqrt(-2 * math.log(R)))


def circular_mean(thetas: list[float]) -> float:
    rad = np.radians(np.array(thetas))
    return float((math.degrees(math.atan2(np.mean(np.sin(rad)), np.mean(np.cos(rad)))) + 360) % 360)


def densify(pts: list[tuple[float, float]], step: float = 3) -> list[tuple[float, float]]:
    out = []
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        out.append((x1, y1))
        d = math.hypot(x2 - x1, y2 - y1)
        if d > step:
            steps = int(d / step)
            for s in range(1, steps):
                t = s / steps
                out.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
    return out


def watershed_masks(raw: dict[str, np.ndarray], names: list[str]) -> dict[str, np.ndarray]:
    union = np.zeros_like(next(iter(raw.values())))
    for m in raw.values():
        union |= m
    galaxy = cv2.morphologyEx(union.astype(np.uint8), cv2.MORPH_CLOSE,
                              cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51)))
    galaxy = fill_holes(galaxy.astype(bool))
    dists = []
    for n in names:
        inv = (~raw[n]).astype(np.uint8)
        dists.append(cv2.distanceTransform(inv, cv2.DIST_L2, 5))
    dists = np.stack(dists, axis=0)
    nearest = np.argmin(dists, axis=0)
    return {n: ((nearest == i) & galaxy) for i, n in enumerate(names)}


def classify_runs(pts: list[tuple[float, float]]) -> list[str]:
    n = len(pts)
    polar = np.array([to_polar(x, y) for x, y in pts])
    thetas, radii = polar[:, 0], polar[:, 1]
    half = WINDOW // 2
    labels = ['corner'] * n
    for i in range(n):
        idxs = [(i + d) % n for d in range(-half, half)]
        std_t = circular_std(thetas[idxs])
        std_r = float(np.std(radii[idxs]))
        if std_t < RADIAL_THETA_STD_MAX and std_r > 6:
            labels[i] = 'radial'
        elif std_r < ARC_R_STD_MAX and std_t > 1.5:
            labels[i] = 'arc'
    return labels


def runs_from_labels(labels: list[str]) -> list[tuple[str, list[int]]]:
    n = len(labels)
    if n == 0:
        return []
    start = 0
    for i in range(n):
        if labels[(i - 1) % n] != labels[i]:
            start = i
            break
    runs: list[tuple[str, list[int]]] = []
    cur_kind = labels[start]
    cur = [start]
    for k in range(1, n):
        i = (start + k) % n
        if labels[i] == cur_kind:
            cur.append(i)
        else:
            runs.append((cur_kind, cur))
            cur_kind = labels[i]
            cur = [i]
    runs.append((cur_kind, cur))
    return runs


def keep_top_n_by_kind(runs: list[tuple[str, list[int]]], n_radial: int, n_arc: int) -> list[tuple[str, list[int]]]:
    """Keep the N_radial longest 'radial' runs + N_arc longest 'arc' runs ;
    drop everything else (corner + extra runs)."""
    radials = sorted([r for r in runs if r[0] == 'radial'], key=lambda r: -len(r[1]))[:n_radial]
    arcs = sorted([r for r in runs if r[0] == 'arc'], key=lambda r: -len(r[1]))[:n_arc]
    kept_set = set(id(r) for r in radials + arcs)
    # Préserver l'ordre original (cyclique).
    return [r for r in runs if id(r) in kept_set]


def fit_segment(kind: str, pts: list[tuple[float, float]], idxs: list[int]) -> dict:
    polar = np.array([to_polar(*pts[i]) for i in idxs])
    thetas, radii = polar[:, 0], polar[:, 1]
    if kind == 'radial':
        theta_c = circular_mean(thetas.tolist())
        return {'type': 'radial', 'theta': round(theta_c, 2),
                'rMin': round(float(radii.min()), 1),
                'rMax': round(float(radii.max()), 1),
                'pixels': len(idxs)}
    else:
        r_c = float(np.median(radii))
        ts = np.sort(thetas)
        gaps = np.concatenate([np.diff(ts), [(ts[0] + 360) - ts[-1]]])
        big = int(np.argmax(gaps))
        t_end = float(ts[big])
        t_start = float(ts[(big + 1) % len(ts)])
        return {'type': 'arc', 'r': round(r_c, 1),
                'thetaStart': round(t_start, 2),
                'thetaEnd': round(t_end, 2),
                'pixels': len(idxs)}


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]
    R, G, B = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)

    raw = {}
    for name, spec in SEGMENTA.items():
        m = spec['mask'](R, G, B)
        m = keep_largest_cc(m)
        m = clean_mask(m, 15)
        raw[name] = m
    names = list(raw.keys())
    final_masks = watershed_masks(raw, names)

    per_segmentum: dict[str, list[dict]] = {}
    for name, mask in final_masks.items():
        contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not contours:
            continue
        contour = max(contours, key=cv2.contourArea).reshape(-1, 2)
        pts = densify([(float(x), float(y)) for (x, y) in contour], step=3)
        labels = classify_runs(pts)
        runs = runs_from_labels(labels)
        runs = [(k, idxs) for k, idxs in runs if len(idxs) >= MIN_RUN_PIXELS]
        spec = SEGMENTA[name]
        kept = keep_top_n_by_kind(runs, spec['nRadial'], spec['nArc'])
        segments = [fit_segment(k, pts, idxs) for (k, idxs) in kept]
        per_segmentum[name] = segments
        nrad = sum(1 for s in segments if s['type'] == 'radial')
        narc = sum(1 for s in segments if s['type'] == 'arc')
        print(f'  {name:10s} : {nrad}R/{spec["nRadial"]} + {narc}A/{spec["nArc"]}'
              f'   ({len(segments)} segments / {len(runs)} runs candidates)')

    # === Render canon polygons : for each Segmentum, draw radials in cyan and
    # arcs in magenta on the user's drawing.
    overlay = (img * 0.55).astype(np.uint8)
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 3)
    drawn_keys: set[str] = set()
    for name, segs in per_segmentum.items():
        for s in segs:
            if s['type'] == 'radial':
                key = f'R|{round(s["theta"]):d}'
                if key in drawn_keys:
                    continue
                drawn_keys.add(key)
                t = math.radians(s['theta'])
                p1 = (int(TERRA[0] + s['rMin'] * math.cos(t)),
                      int(TERRA[1] + s['rMin'] * math.sin(t)))
                p2 = (int(TERRA[0] + s['rMax'] * math.cos(t)),
                      int(TERRA[1] + s['rMax'] * math.sin(t)))
                cv2.line(overlay, p1, p2, (0, 255, 255), 6, cv2.LINE_AA)
            else:
                key = f'A|{round(s["r"] / 8):d}'
                if key in drawn_keys:
                    continue
                drawn_keys.add(key)
                ts, te = s['thetaStart'], s['thetaEnd']
                if te < ts:
                    te += 360
                steps = max(60, int((te - ts) * 1.5))
                pts_arc = []
                for k in range(steps + 1):
                    th = math.radians(ts + (te - ts) * k / steps)
                    pts_arc.append((int(TERRA[0] + s['r'] * math.cos(th)),
                                    int(TERRA[1] + s['r'] * math.sin(th))))
                cv2.polylines(overlay, [np.array(pts_arc, dtype=np.int32)], False,
                              (255, 0, 255), 6, cv2.LINE_AA)

    Image.fromarray(overlay).save(OUT / 'v5-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS).save(
        OUT / 'v5-small.png')
    print(f'\nOverlay : {OUT}/v5-small.png  ({len(drawn_keys)} segments uniques tracés)')

    out_json = {'terra': list(TERRA), 'imageSize': [W, H], 'segmenta': per_segmentum}
    (OUT / 'v5.json').write_text(json.dumps(out_json, indent=2))
    print(f'JSON : {OUT}/v5.json')


if __name__ == '__main__':
    main()
