"""
Segmenta extraction v3 — sliding-window analysis along each zone's contour.

For each colored Segmentum, walk its contour. Within a 30-pixel sliding window,
compute the standard deviation of θ and r vs Terra :
  std(θ) very small AND std(r) large  → window is on a RADIAL
  std(r) very small AND std(θ) large  → window is on an ARC
  otherwise                            → corner / transition

Merge consecutive same-type windows → one canon segment. Each segment then
gets fitted parameters :
  radial : theta = mean of θ, rMin/rMax = range of r
  arc    : r = mean of r, thetaStart/thetaEnd = range of θ

Then dedup shared borders between Segmenta neighbours via parameter matching.

Output : /tmp/seg/canon-v3-{full,small}.png and segmenta-v3.json
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
    'solar':     {'mask': lambda r, g, b: (r > 180) & (g > 100) & (g < 200) & (b < 120)},
    'tempestus': {'mask': lambda r, g, b: (g > 180) & (r < 120) & (b < 120)},
    'ultima':    {'mask': lambda r, g, b: (b > 180) & (g > 150) & (r < 200) & (r > 80)},
    'pacificus': {'mask': lambda r, g, b: (r > 180) & (g < 60) & (b < 60)},
    'obscurus':  {'mask': lambda r, g, b: (r > 80) & (r < 200) & (g < 60) & (b > 180)},
}

WINDOW = 30
RADIAL_THETA_STD_MAX = 0.7        # ° — fenêtre est radiale si std(θ) sous ce seuil
RADIAL_R_STD_MIN = 8              # px — la radiale doit varier en r
ARC_R_STD_MAX = 4                 # px — fenêtre est arc si std(r) sous ce seuil
ARC_THETA_STD_MIN = 1.5           # °  — l'arc doit varier en θ
MIN_SEGMENT_PIXELS = 25           # un segment retenu doit avoir ≥ ce nombre


def to_polar(x: float, y: float) -> tuple[float, float]:
    dx, dy = x - TERRA[0], y - TERRA[1]
    return (math.degrees(math.atan2(dy, dx)) + 360) % 360, math.hypot(dx, dy)


def keep_largest_cc(mask: np.ndarray) -> np.ndarray:
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    largest = 1 + int(np.argmax(stats[1:, 4]))
    return lbl == largest


def clean_mask(mask: np.ndarray, k: int = 15) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    return m.astype(bool)


def extract_contour(mask: np.ndarray) -> np.ndarray | None:
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    return max(contours, key=cv2.contourArea).reshape(-1, 2)


def densify(pts: list[tuple[float, float]], step: float = 3) -> list[tuple[float, float]]:
    """Insert interpolation points so consecutive pixels are at most `step` apart."""
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


def circular_std(thetas: np.ndarray) -> float:
    """Standard deviation of angles taking circular wrap into account (degrees)."""
    if len(thetas) < 2:
        return 0.0
    rad = np.radians(thetas)
    sin_mean = np.mean(np.sin(rad))
    cos_mean = np.mean(np.cos(rad))
    R = math.hypot(sin_mean, cos_mean)
    R = max(min(R, 1.0), 1e-12)
    return math.degrees(math.sqrt(-2 * math.log(R)))


def classify_segmentum(name: str, pts: list[tuple[float, float]]) -> list[dict]:
    """
    Walk the (closed) contour with a sliding window. Each pixel gets a label
    from {radial, arc, corner}. Then merge consecutive same-label pixels into
    canon segments.
    """
    n = len(pts)
    if n < WINDOW:
        return []
    polar = np.array([to_polar(x, y) for (x, y) in pts])
    thetas = polar[:, 0]
    radii = polar[:, 1]

    half = WINDOW // 2
    labels = ['corner'] * n
    for i in range(n):
        idxs = [(i + d) % n for d in range(-half, half)]
        win_t = thetas[idxs]
        win_r = radii[idxs]
        std_t = circular_std(win_t)
        std_r = float(np.std(win_r))
        is_radial = std_t < RADIAL_THETA_STD_MAX and std_r > RADIAL_R_STD_MIN
        is_arc = std_r < ARC_R_STD_MAX and std_t > ARC_THETA_STD_MIN
        if is_radial and not is_arc:
            labels[i] = 'radial'
        elif is_arc and not is_radial:
            labels[i] = 'arc'
        elif is_radial and is_arc:
            labels[i] = 'radial' if std_t / max(0.01, std_r) < 0.05 else 'arc'
        else:
            labels[i] = 'corner'

    # Smooth small gaps (corner pixels < 5 surrounded by same-kind on both sides → absorb).
    for _ in range(3):
        changed = 0
        new_labels = list(labels)
        for i in range(n):
            if labels[i] == 'corner':
                # cherche le vrai voisin gauche et droit
                left = next((labels[(i - k) % n] for k in range(1, 8) if labels[(i - k) % n] != 'corner'), None)
                right = next((labels[(i + k) % n] for k in range(1, 8) if labels[(i + k) % n] != 'corner'), None)
                if left is not None and left == right:
                    new_labels[i] = left
                    changed += 1
        labels = new_labels
        if changed == 0:
            break

    # Identify run starts on the closed contour.
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

    # Filter and emit segments.
    segments: list[dict] = []
    for kind, idxs in runs:
        if kind == 'corner' or len(idxs) < MIN_SEGMENT_PIXELS:
            continue
        ts = thetas[idxs]
        rs = radii[idxs]
        if kind == 'radial':
            rad_mean = math.atan2(np.mean(np.sin(np.radians(ts))), np.mean(np.cos(np.radians(ts))))
            theta_c = (math.degrees(rad_mean) + 360) % 360
            segments.append({
                'type': 'radial',
                'theta': round(theta_c, 2),
                'rMin': round(float(rs.min()), 1),
                'rMax': round(float(rs.max()), 1),
                'pixels': len(idxs),
                'pts': [tuple(map(float, pts[idxs[0]])), tuple(map(float, pts[idxs[-1]]))],
            })
        else:  # arc
            r_mean = float(np.mean(rs))
            ts_sorted = np.sort(ts)
            gaps = np.concatenate([np.diff(ts_sorted), [(ts_sorted[0] + 360) - ts_sorted[-1]]])
            big = int(np.argmax(gaps))
            t_end = float(ts_sorted[big])
            t_start = float(ts_sorted[(big + 1) % len(ts_sorted)])
            segments.append({
                'type': 'arc',
                'r': round(r_mean, 1),
                'thetaStart': round(t_start, 2),
                'thetaEnd': round(t_end, 2),
                'pixels': len(idxs),
                'pts': [tuple(map(float, pts[idxs[0]])), tuple(map(float, pts[idxs[-1]]))],
            })
    return segments


def merge_shared(per_segmentum: dict[str, list[dict]]) -> dict[str, list[dict]]:
    """Tag each segment with the list of Segmenta it belongs to (≥2 = shared)."""
    flat: list[tuple[str, dict]] = []
    for name, segs in per_segmentum.items():
        for s in segs:
            flat.append((name, s))
    used = set()
    groups: list[list[tuple[str, dict]]] = []
    for i, (an, asg) in enumerate(flat):
        if i in used:
            continue
        group = [(an, asg)]
        used.add(i)
        for j in range(i + 1, len(flat)):
            if j in used:
                continue
            bn, bsg = flat[j]
            if bn == an:
                continue
            if asg['type'] != bsg['type']:
                continue
            if asg['type'] == 'radial':
                dt = abs((asg['theta'] - bsg['theta'] + 180) % 360 - 180)
                rmin_a, rmax_a = asg['rMin'], asg['rMax']
                rmin_b, rmax_b = bsg['rMin'], bsg['rMax']
                overlap = max(0, min(rmax_a, rmax_b) - max(rmin_a, rmin_b))
                if dt < 4 and overlap > 30:
                    group.append((bn, bsg))
                    used.add(j)
            else:
                dr = abs(asg['r'] - bsg['r'])
                ts_a, te_a = asg['thetaStart'], asg['thetaEnd']
                ts_b, te_b = bsg['thetaStart'], bsg['thetaEnd']
                # Heuristique chevauchement angulaire.
                ca = ((ts_a + te_a) / 2) % 360
                cb = ((ts_b + te_b) / 2) % 360
                dc = abs((ca - cb + 180) % 360 - 180)
                if dr < 12 and dc < 30:
                    group.append((bn, bsg))
                    used.add(j)
        groups.append(group)

    # Tag segments with `between` list and `shared` flag.
    out: dict[str, list[dict]] = {n: [] for n in per_segmentum}
    for group in groups:
        names = sorted(set(n for n, _ in group))
        # Average parameters across members.
        t_first = group[0][1]['type']
        if t_first == 'radial':
            theta_avg = math.degrees(math.atan2(
                np.mean([math.sin(math.radians(s[1]['theta'])) for s in group]),
                np.mean([math.cos(math.radians(s[1]['theta'])) for s in group]),
            )) % 360
            rmin_avg = float(np.mean([s[1]['rMin'] for s in group]))
            rmax_avg = float(np.mean([s[1]['rMax'] for s in group]))
            tagged = {
                'type': 'radial',
                'theta': round(theta_avg, 2),
                'rMin': round(rmin_avg, 1),
                'rMax': round(rmax_avg, 1),
                'between': names,
                'shared': len(names) > 1,
            }
        else:
            r_avg = float(np.mean([s[1]['r'] for s in group]))
            tagged = {
                'type': 'arc',
                'r': round(r_avg, 1),
                'thetaStart': round(float(np.mean([s[1]['thetaStart'] for s in group])), 2),
                'thetaEnd':   round(float(np.mean([s[1]['thetaEnd']   for s in group])), 2),
                'between': names,
                'shared': len(names) > 1,
            }
        for n in names:
            out[n].append(tagged)
    return out


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]
    R, G, B = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)

    per_seg: dict[str, list[dict]] = {}
    for name, spec in SEGMENTA.items():
        m = spec['mask'](R, G, B)
        m = keep_largest_cc(m)
        m = clean_mask(m, 15)
        contour = extract_contour(m)
        if contour is None:
            continue
        pts = densify([(float(x), float(y)) for (x, y) in contour], step=3)
        segs = classify_segmentum(name, pts)
        per_seg[name] = segs
        nrad = sum(1 for s in segs if s['type'] == 'radial')
        narc = sum(1 for s in segs if s['type'] == 'arc')
        print(f'  {name:10s} : {nrad} radiales + {narc} arcs   ({len(segs)} segments, '
              f'{sum(s["pixels"] for s in segs)} px utiles)')

    merged = merge_shared(per_seg)
    print(f'\n=== Après dédup frontières partagées ===')
    for name, segs in merged.items():
        nrad = sum(1 for s in segs if s['type'] == 'radial')
        narc = sum(1 for s in segs if s['type'] == 'arc')
        sh = sum(1 for s in segs if s['shared'])
        print(f'  {name:10s} : {nrad} radiales + {narc} arcs (dont {sh} partagés)')

    # === Render overlay ===
    overlay = (img * 0.45).astype(np.uint8)
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 3)
    drawn: set[str] = set()
    n_drawn = 0
    for name, segs in merged.items():
        for s in segs:
            if s['type'] == 'radial':
                key = f'R|{round(s["theta"]):d}'
            else:
                key = f'A|{round(s["r"] / 8):d}'
            if key in drawn:
                continue
            drawn.add(key)
            n_drawn += 1
            color = (0, 255, 255) if s['type'] == 'radial' else (255, 0, 255)
            if s['type'] == 'radial':
                t = math.radians(s['theta'])
                p1 = (int(TERRA[0] + s['rMin'] * math.cos(t)),
                      int(TERRA[1] + s['rMin'] * math.sin(t)))
                p2 = (int(TERRA[0] + s['rMax'] * math.cos(t)),
                      int(TERRA[1] + s['rMax'] * math.sin(t)))
                cv2.line(overlay, p1, p2, color, 5, cv2.LINE_AA)
            else:
                ts, te = s['thetaStart'], s['thetaEnd']
                if te < ts:
                    te += 360
                steps = max(60, int((te - ts) * 1.5))
                pts_arc = []
                for k in range(steps + 1):
                    th = math.radians(ts + (te - ts) * k / steps)
                    pts_arc.append((int(TERRA[0] + s['r'] * math.cos(th)),
                                    int(TERRA[1] + s['r'] * math.sin(th))))
                cv2.polylines(overlay, [np.array(pts_arc, dtype=np.int32)], False, color, 5, cv2.LINE_AA)

    Image.fromarray(overlay).save(OUT / 'canon-v3-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS).save(
        OUT / 'canon-v3-small.png')
    print(f'\nOverlay : {OUT}/canon-v3-small.png  ({n_drawn} segments uniques tracés)')

    out_json = {'terra': list(TERRA), 'imageSize': [W, H], 'segmenta': merged}
    (OUT / 'segmenta-v3.json').write_text(json.dumps(out_json, indent=2))
    print(f'JSON : {OUT}/segmenta-v3.json')


if __name__ == '__main__':
    main()
