"""
Segmenta extraction v2 — directly from per-zone borders.

The previous approach classified every contour pixel as radial-vs-arc via local
tangent alignment, then ran k-means. It produced segments that did not stick to
the colored zones.

This version takes the bones of the user's drawing directly :
  1. Build a label image where each pixel is the index of its Segmentum (or 0
     for background)
  2. For every pair of Segmenta (A, B) where A != B, collect FRONTIER PIXELS :
     pixels of A whose 8-neighbourhood touches B
  3. Each such collection is the SHARED BORDER between A and B. Convert pixels
     to (θ, r) vs Terra and find the θ peaks (= radials) and r peaks (= arcs)
     of THIS pair only. Each peak is one canon segment.
  4. For each Segmentum, also collect "external border pixels" (where the
     neighbour is background or out-of-bounds) and detect canon segments there.
  5. Render an overlay : each canon segment drawn ONCE, hugging the colored zone.

JSON output : list of canon segments, each annotated with the Segmenta it
borders ("between": ['solar', 'pacificus']) — shared by construction.
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
COLOR = {
    'solar':     (224, 160, 64),
    'tempestus': (64, 200, 80),
    'ultima':    (90, 130, 220),
    'pacificus': (210, 60, 60),
    'obscurus':  (130, 60, 200),
}

# Tolérances pour détecter des pics canon dans les frontières.
# Une frontière courte (~30 px) doit pouvoir produire 1 pic.
PEAK_RATIO_THETA = 0.35
PEAK_RATIO_R = 0.35
MIN_PIXELS_PER_SEGMENT = 25


def to_polar_arr(xs: np.ndarray, ys: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    dx = xs - TERRA[0]
    dy = ys - TERRA[1]
    return (np.degrees(np.arctan2(dy, dx)) + 360) % 360, np.hypot(dx, dy)


def build_label_image(arr: np.ndarray) -> tuple[np.ndarray, list[str]]:
    """Each pixel labelled with the index (1..K) of its Segmentum, or 0 for bg."""
    H, W = arr.shape[:2]
    R = arr[..., 0].astype(int)
    G = arr[..., 1].astype(int)
    B = arr[..., 2].astype(int)
    label = np.zeros((H, W), dtype=np.int32)
    names: list[str] = []
    for i, (name, spec) in enumerate(SEGMENTA.items(), start=1):
        m = spec['mask'](R, G, B)
        # Largest connected component + closing for noise.
        m_u8 = m.astype(np.uint8)
        n, lbl, stats, _ = cv2.connectedComponentsWithStats(m_u8, connectivity=8)
        if n > 1:
            largest = 1 + int(np.argmax(stats[1:, 4]))
            m = lbl == largest
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        m_u8 = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, kernel)
        m_u8 = cv2.morphologyEx(m_u8, cv2.MORPH_CLOSE, kernel)
        label[m_u8.astype(bool)] = i
        names.append(name)
    return label, names


def per_pair_frontiers(label: np.ndarray, names: list[str]) -> dict[tuple[str, str], np.ndarray]:
    """
    Pour chaque paire (A, B), retourne les pixels du contour de A qui sont à
    moins de FRONTIER_DIST pixels du contour de B. Robuste aux gaps quelconques.
    """
    FRONTIER_DIST = 40
    K = len(names)
    contours_per: list[np.ndarray] = []
    for i in range(K):
        m = (label == (i + 1)).astype(np.uint8)
        # Contour binaire : pixels du mask qui ont au moins un voisin extérieur.
        eroded = cv2.erode(m, np.ones((3, 3), np.uint8))
        contour = m - eroded  # 0/1
        contours_per.append(contour.astype(bool))
    # Distance transform (en pixels) à chaque contour.
    dt_per: list[np.ndarray] = []
    for i in range(K):
        # cv2.distanceTransform attend un masque où "0" = à mesurer ; on inverse.
        inv = (~contours_per[i]).astype(np.uint8)
        dt = cv2.distanceTransform(inv, cv2.DIST_L2, 5)
        dt_per.append(dt)
    result: dict[tuple[str, str], np.ndarray] = {}
    for i in range(K):
        for j in range(i + 1, K):
            # Pixels du contour de i qui sont à <= FRONTIER_DIST du contour de j.
            mask = contours_per[i] & (dt_per[j] <= FRONTIER_DIST)
            ys, xs = np.where(mask)
            if len(xs) == 0:
                continue
            key = tuple(sorted([names[i], names[j]]))
            result[key] = np.stack([xs, ys], axis=1)
    return result


def find_canon_peaks(theta: np.ndarray, r: np.ndarray) -> tuple[list[float], list[float]]:
    """
    Search for canon segments inside a single frontier's pixel cloud.
    A radial = θ peak (very narrow theta band, large r spread).
    An arc   = r peak (very narrow r band, large theta spread).
    Returns (radial_thetas, arc_radii).
    """
    if len(theta) < MIN_PIXELS_PER_SEGMENT:
        return [], []
    # Histogram θ at 0.5° resolution.
    bins_t = 720
    hist_t, _ = np.histogram(theta, bins=bins_t, range=(0, 360))
    hist_t_s = np.convolve(hist_t, np.ones(5) / 5, mode='same')
    # Histogram r at 4 px resolution.
    r_max = float(r.max())
    bins_r = max(40, int(r_max / 4))
    hist_r, edges_r = np.histogram(r, bins=bins_r, range=(0, max(1.0, r_max + 4)))
    hist_r_s = np.convolve(hist_r, np.ones(5) / 5, mode='same')

    def peaks(hist: np.ndarray, ratio: float, min_sep: int, circular: bool) -> list[int]:
        max_v = hist.max()
        if max_v == 0:
            return []
        thr = max_v * ratio
        n = len(hist)
        picked: list[int] = []
        blocked = np.zeros(n, dtype=bool)
        for idx in np.argsort(-hist):
            if hist[idx] < thr:
                break
            if blocked[idx]:
                continue
            picked.append(int(idx))
            for d in range(-min_sep, min_sep + 1):
                blocked[(idx + d) % n if circular else max(0, min(n - 1, idx + d))] = True
        return picked

    t_idx = peaks(hist_t_s, PEAK_RATIO_THETA, min_sep=10, circular=True)
    r_idx = peaks(hist_r_s, PEAK_RATIO_R, min_sep=4, circular=False)

    radial_thetas = sorted([float((p + 0.5) * 0.5) for p in t_idx])
    arc_radii = sorted([float((edges_r[p] + edges_r[p + 1]) / 2) for p in r_idx])

    # Filter : un pic radiale est valide si la couverture en r est large
    # (sinon c'est un pic accidentel sur un arc concentré).
    real_radials = []
    for th in radial_thetas:
        d_theta = np.minimum(np.abs(theta - th), 360 - np.abs(theta - th))
        close = r[d_theta < 1.5]
        if len(close) >= MIN_PIXELS_PER_SEGMENT and (close.max() - close.min()) > 30:
            real_radials.append(th)
    real_arcs = []
    for rv in arc_radii:
        close = theta[np.abs(r - rv) < 6]
        if len(close) >= MIN_PIXELS_PER_SEGMENT:
            sorted_t = np.sort(close)
            gaps = np.diff(np.concatenate([sorted_t, sorted_t[:1] + 360]))
            covered = 360 - gaps.max()
            if covered > 5:  # arc d'au moins 5°
                real_arcs.append(rv)
    return real_radials, real_arcs


def segments_for_pixels(xs: np.ndarray, ys: np.ndarray) -> list[dict]:
    """For a single border (set of pixels), return its canon segments."""
    if len(xs) == 0:
        return []
    theta, r = to_polar_arr(xs, ys)
    radials, arcs = find_canon_peaks(theta, r)
    out: list[dict] = []
    # Assign each pixel to nearest peak (radial vs arc), then derive bounds.
    for th in radials:
        d_theta = np.minimum(np.abs(theta - th), 360 - np.abs(theta - th))
        # Pixels strictement plus proches de cette radiale que de tout arc.
        d_pix_radial = r * np.radians(d_theta)
        d_pix_arc = np.full_like(r, np.inf)
        for rv in arcs:
            d_pix_arc = np.minimum(d_pix_arc, np.abs(r - rv))
        on_radial = d_pix_radial < d_pix_arc
        on_radial &= d_theta < 4
        if on_radial.sum() < MIN_PIXELS_PER_SEGMENT:
            continue
        rs = r[on_radial]
        rs_sorted = np.sort(rs)
        lo = float(rs_sorted[max(0, int(len(rs_sorted) * 0.02))])
        hi = float(rs_sorted[min(len(rs_sorted) - 1, int(len(rs_sorted) * 0.98))])
        out.append({'type': 'radial', 'theta': round(th, 2),
                    'rMin': round(lo, 1), 'rMax': round(hi, 1),
                    'pixels': int(on_radial.sum())})
    for rv in arcs:
        d_pix_arc = np.abs(r - rv)
        d_pix_rad = np.full_like(r, np.inf)
        for th in radials:
            d_theta = np.minimum(np.abs(theta - th), 360 - np.abs(theta - th))
            d_pix_rad = np.minimum(d_pix_rad, r * np.radians(d_theta))
        on_arc = d_pix_arc < d_pix_rad
        on_arc &= d_pix_arc < 8
        if on_arc.sum() < MIN_PIXELS_PER_SEGMENT:
            continue
        ts = np.sort(theta[on_arc])
        gaps = np.concatenate([np.diff(ts), [(ts[0] + 360) - ts[-1]]])
        big = int(np.argmax(gaps))
        t_end = float(ts[big])
        t_start = float(ts[(big + 1) % len(ts)])
        out.append({'type': 'arc', 'r': round(rv, 1),
                    'thetaStart': round(t_start, 2), 'thetaEnd': round(t_end, 2),
                    'pixels': int(on_arc.sum())})
    return out


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]

    label, names = build_label_image(img)
    print(f'Labels : {names}')
    for i, name in enumerate(names, start=1):
        print(f'  {name:10s} pixels = {(label == i).sum():>9d}')

    pair_pixels = per_pair_frontiers(label, names)
    print(f'\n{len(pair_pixels)} paires de Segmenta avec frontière commune :')
    for (a, b), arr in sorted(pair_pixels.items()):
        print(f'  {a:10s} ↔ {b:10s} : {len(arr):>6d} px frontière')

    # === Détection segments par paire ===
    all_segments: list[dict] = []
    per_pair_segments: dict[tuple[str, str], list[dict]] = {}
    for pair, pix in sorted(pair_pixels.items()):
        if len(pix) < MIN_PIXELS_PER_SEGMENT:
            continue
        xs = pix[:, 0]
        ys = pix[:, 1]
        segs = segments_for_pixels(xs, ys)
        per_pair_segments[pair] = segs
        for s in segs:
            s['between'] = list(pair)
            all_segments.append(s)

    print(f'\n=== Segments canon détectés par paire ===')
    seg_count_by_segmentum: dict[str, dict[str, int]] = {n: {'radial': 0, 'arc': 0} for n in names}
    for pair, segs in sorted(per_pair_segments.items()):
        rs = sum(1 for s in segs if s['type'] == 'radial')
        ars = sum(1 for s in segs if s['type'] == 'arc')
        print(f'  {pair[0]:10s} ↔ {pair[1]:10s} : {rs} radiale(s) + {ars} arc(s)')
        for s in segs:
            seg_count_by_segmentum[pair[0]][s['type']] += 1
            seg_count_by_segmentum[pair[1]][s['type']] += 1

    print(f'\n=== Total segments par Segmentum (somme des frontières) ===')
    for name, c in seg_count_by_segmentum.items():
        print(f'  {name:10s} : {c["radial"]} radiales + {c["arc"]} arcs')

    # === Render overlay ===
    overlay = (img * 0.45).astype(np.uint8)
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 3)
    drawn_keys: set[str] = set()
    for s in all_segments:
        if s['type'] == 'radial':
            key = f'R|{round(s["theta"]):d}|{round(s["rMin"]/15):d}|{round(s["rMax"]/15):d}'
            if key in drawn_keys:
                continue
            drawn_keys.add(key)
            t = math.radians(s['theta'])
            p1 = (int(TERRA[0] + s['rMin'] * math.cos(t)),
                  int(TERRA[1] + s['rMin'] * math.sin(t)))
            p2 = (int(TERRA[0] + s['rMax'] * math.cos(t)),
                  int(TERRA[1] + s['rMax'] * math.sin(t)))
            cv2.line(overlay, p1, p2, (0, 255, 255), 5, cv2.LINE_AA)
        else:
            key = f'A|{round(s["r"]/12):d}|{round(s["thetaStart"]/3):d}|{round(s["thetaEnd"]/3):d}'
            if key in drawn_keys:
                continue
            drawn_keys.add(key)
            ts, te = s['thetaStart'], s['thetaEnd']
            if te < ts:
                te += 360
            steps = max(60, int((te - ts) * 1.5))
            pts = []
            for k in range(steps + 1):
                th = math.radians(ts + (te - ts) * k / steps)
                pts.append((int(TERRA[0] + s['r'] * math.cos(th)),
                            int(TERRA[1] + s['r'] * math.sin(th))))
            cv2.polylines(overlay, [np.array(pts, dtype=np.int32)], False, (255, 0, 255), 5, cv2.LINE_AA)

    Image.fromarray(overlay).save(OUT / 'canon-v2-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS).save(
        OUT / 'canon-v2-small.png')
    print(f'\nOverlay : {OUT}/canon-v2-small.png  ({len(drawn_keys)} segments uniques tracés)')

    # JSON
    out_json = {
        'terra': list(TERRA),
        'imageSize': [W, H],
        'segments': all_segments,
    }
    (OUT / 'segmenta-v2.json').write_text(json.dumps(out_json, indent=2))
    print(f'JSON : {OUT}/segmenta-v2.json')


if __name__ == '__main__':
    main()
