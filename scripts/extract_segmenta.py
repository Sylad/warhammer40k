"""
Extract Segmenta polygons from user-painted color map, enforcing the canon rule :
each polygon edge must be either
    (R) a radial — straight line that, extended, passes through Terra
    (A) an arc   — fragment of a circle centered on Terra
    (B) a border — clamped to the map rectangle (cropped wedge)

Pipeline :
  1. Load /downloads/galaxy-map-segmenta.jpg
  2. For each Segmentum, build a color mask, drop noise (LCC + morpho)
  3. Extract the outer contour (cv2.findContours)
  4. Classify each contour pixel via local tangent alignment vs Terra direction
  5. Smoothing pass : absorb "other" pixels into majority neighbour kind
  6. Compression : walk runs of same-kind pixels → list of canon segments
     (Radial(θ, rMin, rMax) / Arc(r, θMin, θMax) / Border(p1, p2))
  7. JSON output per Segmentum + re-render canon polygons on the map

Usage : python3 extract_segmenta.py
"""
from __future__ import annotations
import json
import math
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SRC = Path('/home/sylvain_ladoire/projects/developpeur/downloads/galaxy-map-segmenta.jpg')
OUT_DIR = Path('/tmp/seg')
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Terra = centroïde du disque Solar mesuré sur l'image utilisateur (966, 1257),
# qui colle à la valeur canon (967, 1255) à 1px près. On garde la canon.
TERRA = (967, 1255)

# Masks par couleur (heuristiques larges pour absorber le bruit JPEG).
# (R, G, B) ranges — un pixel match si toutes les composantes sont dans le range.
SEGMENTA = {
    # nRadial / nArc dictent le k-means : nombres de segments DROITS / ARCS LISSES
    # attendus dans la géométrie canon. Chiffres validés avec l'utilisateur.
    'solar':     {'color': (224, 160, 64),  'mask': lambda r, g, b: (r > 180) & (g > 100) & (g < 200) & (b < 120),
                  'nRadial': 5, 'nArc': 5},
    'tempestus': {'color': (32, 224, 64),   'mask': lambda r, g, b: (g > 180) & (r < 120) & (b < 120),
                  'nRadial': 4, 'nArc': 4},
    'ultima':    {'color': (128, 192, 224), 'mask': lambda r, g, b: (b > 180) & (g > 150) & (r < 200) & (r > 80),
                  'nRadial': 6, 'nArc': 6},
    'pacificus': {'color': (224, 0, 0),     'mask': lambda r, g, b: (r > 180) & (g < 60) & (b < 60),
                  'nRadial': 2, 'nArc': 2},
    'obscurus':  {'color': (128, 0, 224),   'mask': lambda r, g, b: (r > 80) & (r < 200) & (g < 60) & (b > 180),
                  'nRadial': 5, 'nArc': 5},
}

# Topologie : qui touche qui (frontières partagées par paire).
NEIGHBOURS: list[tuple[str, str]] = [
    ('solar', 'pacificus'),
    ('solar', 'tempestus'),
    ('solar', 'ultima'),
    ('solar', 'obscurus'),
    ('pacificus', 'tempestus'),
    ('tempestus', 'ultima'),
    ('ultima', 'obscurus'),
    ('obscurus', 'pacificus'),
]

# Classification : on calcule la direction tangente locale du contour et on
# mesure son alignement avec la direction RADIALE depuis Terra.
#   alignment = |tangent · radial_unit|
# alignment ≈ 1  → tangent // radial → arête RADIALE
# alignment ≈ 0  → tangent ⊥ radial → arête ARC
# zone grise   → "other" (transition ou bruit)
TANGENT_WINDOW = 8         # demi-fenêtre (px) pour estimer la tangente locale
RADIAL_ALIGN_MIN = 0.92    # cos(~23°) — au-dessus = clairement radial
ARC_ALIGN_MAX = 0.30       # cos(~73°) — en-dessous = clairement arc
MIN_R_FROM_TERRA = 8       # pixels trop proches de Terra → polar instable, skip


def to_polar(x: float, y: float) -> tuple[float, float]:
    dx, dy = x - TERRA[0], y - TERRA[1]
    return math.degrees(math.atan2(dy, dx)) % 360, math.hypot(dx, dy)


def classify_pixel(pts: list[tuple[float, float]], i: int) -> str:
    n = len(pts)
    x0, y0 = pts[i]
    r = math.hypot(x0 - TERRA[0], y0 - TERRA[1])
    if r < MIN_R_FROM_TERRA:
        return 'other'
    # Tangente locale : moyenne des écarts entre pixel i-W et i+W.
    a = pts[(i - TANGENT_WINDOW) % n]
    b = pts[(i + TANGENT_WINDOW) % n]
    tx, ty = b[0] - a[0], b[1] - a[1]
    norm = math.hypot(tx, ty)
    if norm < 1e-6:
        return 'other'
    tx, ty = tx / norm, ty / norm
    # Direction radiale unitaire (Terra → pixel).
    rx, ry = (x0 - TERRA[0]) / r, (y0 - TERRA[1]) / r
    align = abs(tx * rx + ty * ry)
    if align >= RADIAL_ALIGN_MIN:
        return 'radial'
    if align <= ARC_ALIGN_MAX:
        return 'arc'
    return 'other'


def keep_largest_cc(mask: np.ndarray) -> np.ndarray:
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    # Stats column 4 = pixel area, skip background label 0.
    largest = 1 + int(np.argmax(stats[1:, 4]))
    return labels == largest


def clean_mask(mask: np.ndarray, kernel_size: int = 9) -> np.ndarray:
    """
    Morphological clean : opening (drop small artefacts isolés) puis closing
    (boucher les petits trous internes laissés par le dessin user / résidus du
    fond de map). Le kernel doit être assez grand pour absorber labels &
    marker icons, mais pas tellement qu'il déforme les vrais bords.
    """
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    cleaned = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, k)
    cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, k)
    return cleaned.astype(bool)


def extract_contour(mask: np.ndarray) -> np.ndarray | None:
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    return max(contours, key=cv2.contourArea).reshape(-1, 2)


# ---------- Compression k-means : N radiales + N arcs forcés par Segmentum ----------


def _find_peaks(hist: np.ndarray, k: int, min_separation: int) -> list[int]:
    """
    Garantit l'élection de k pics : on relâche le min_separation si nécessaire.
    Stratégie : on essaie d'abord avec min_separation, on garde tout pic >0,
    puis si on n'a pas k pics on relâche progressivement.
    """
    n = len(hist)
    sep = min_separation
    while sep >= 1:
        picked: list[int] = []
        blocked = np.zeros(n, dtype=bool)
        order = np.argsort(-hist)
        for idx in order:
            if blocked[idx] or hist[idx] == 0:
                continue
            picked.append(int(idx))
            for d in range(-sep, sep + 1):
                blocked[(idx + d) % n] = True
            if len(picked) >= k:
                return picked
        sep = max(1, sep // 2) if sep > 1 else 0
        if sep == 0:
            break
    # Fallback : on remplit avec n'importe quels indices restants.
    while len(picked) < k:
        for i in range(n):
            if i not in picked:
                picked.append(i)
                break
        else:
            break
    return picked


def kmeans_1d(xs: list[float], k: int, max_iter: int = 60) -> tuple[list[float], list[int]]:
    """K-means 1D, init aux pics de l'histogramme (modes dominants)."""
    xs = np.asarray(xs, dtype=float)
    if len(xs) == 0 or k == 0:
        return [], []
    k = min(k, len(xs))
    # Histogramme à pas 10 unités sur le range observé.
    lo, hi = xs.min(), xs.max()
    bins = max(20, int((hi - lo) / 10))
    hist, edges = np.histogram(xs, bins=bins, range=(lo, hi))
    peaks = _find_peaks(hist, k, min_separation=max(1, bins // (k * 3)))
    centres = np.array([(edges[p] + edges[p + 1]) / 2 for p in peaks])
    for _ in range(max_iter):
        d = np.abs(xs[:, None] - centres[None, :])
        labels = np.argmin(d, axis=1)
        new_centres = np.array([xs[labels == j].mean() if (labels == j).any() else centres[j] for j in range(k)])
        if np.allclose(new_centres, centres, atol=0.01):
            break
        centres = new_centres
    order = np.argsort(centres)
    centres_sorted = centres[order]
    remap = {old: new for new, old in enumerate(order)}
    labels = np.array([remap[int(l)] for l in labels])
    return centres_sorted.tolist(), labels.tolist()


def kmeans_circular(thetas_deg: list[float], k: int, max_iter: int = 60) -> tuple[list[float], list[int]]:
    """K-means circulaire, init aux pics de l'histogramme angulaire."""
    if len(thetas_deg) == 0 or k == 0:
        return [], []
    k = min(k, len(thetas_deg))
    arr = np.asarray(thetas_deg, dtype=float) % 360
    bins = 360
    hist, _ = np.histogram(arr, bins=bins, range=(0, 360))
    peaks = _find_peaks(hist, k, min_separation=max(8, bins // (k * 3)))
    init_thetas = np.array([float(p) + 0.5 for p in peaks])
    init_rad = np.radians(init_thetas)
    centres = np.stack([np.cos(init_rad), np.sin(init_rad)], axis=1)
    rad = np.radians(arr)
    pts = np.stack([np.cos(rad), np.sin(rad)], axis=1)
    for _ in range(max_iter):
        d = np.linalg.norm(pts[:, None, :] - centres[None, :, :], axis=2)
        labels = np.argmin(d, axis=1)
        new_centres = np.array([pts[labels == j].mean(axis=0) if (labels == j).any() else centres[j] for j in range(k)])
        norms = np.linalg.norm(new_centres, axis=1, keepdims=True)
        new_centres = new_centres / np.maximum(norms, 1e-9)
        if np.allclose(new_centres, centres, atol=0.001):
            break
        centres = new_centres
    centre_thetas = (np.degrees(np.arctan2(centres[:, 1], centres[:, 0])) + 360) % 360
    order = np.argsort(centre_thetas)
    centres_sorted = centre_thetas[order]
    remap = {old: new for new, old in enumerate(order)}
    labels = np.array([remap[int(l)] for l in labels])
    return centres_sorted.tolist(), labels.tolist()


def compress_segmentum(name: str, pts: list[tuple[float, float]], kinds: list[str],
                        n_radial: int, n_arc: int) -> list[dict]:
    """
    NOUVELLE approche directe (sans pré-classification pixel) :
    1. Calculer (θ, r) pour chaque pixel du contour
    2. Histogramme circulaire de θ → trouver les n_radial pics absolus
       Histogramme de r          → trouver les n_arc pics absolus
    3. Pour chaque pixel : déterminer son AFFECTATION (radial j ou arc k) en
       comparant l'écart en pixels-équivalents :
          dRadial = r * sin(Δθ) ≈ r * Δθ_rad  (distance pixel à la radiale θ_j)
          dArc    = |r - r_k|                  (distance pixel à l'arc r_k)
       Le pixel est assigné à la plus petite distance (= "il est sur cette frontière")
    4. Pour chaque radiale : θ = pic, rMin/rMax = min/max des r de ses pixels
       Pour chaque arc     : r = pic, θStart/θEnd = couverture angulaire des pixels
    """
    if not pts:
        return []
    polar = [to_polar(x, y) for (x, y) in pts]
    thetas_all = np.array([p[0] for p in polar])
    rs_all = np.array([p[1] for p in polar])

    # 1. Pics radiales sur l'histogramme θ (bins de 0.5°).
    bins_t = 720
    hist_t, _ = np.histogram(thetas_all, bins=bins_t, range=(0, 360))
    hist_t_s = np.convolve(hist_t, np.ones(5) / 5, mode='same')
    radial_peak_idx = _find_peaks(hist_t_s, n_radial, min_separation=max(8, bins_t // (n_radial * 4)))
    radial_thetas = sorted([float(p) * 0.5 + 0.25 for p in radial_peak_idx])

    # 2. Pics arcs sur l'histogramme r (bins de 8 px).
    r_max = float(rs_all.max()) if len(rs_all) else 1.0
    bins_r = max(40, int(r_max / 8))
    hist_r, edges_r = np.histogram(rs_all, bins=bins_r, range=(0, max(1.0, r_max + 8)))
    hist_r_s = np.convolve(hist_r, np.ones(7) / 7, mode='same')
    arc_peak_idx = _find_peaks(hist_r_s, n_arc, min_separation=max(2, bins_r // (n_arc * 5)))
    arc_radii = sorted([float((edges_r[p] + edges_r[p + 1]) / 2) for p in arc_peak_idx])

    # 3. Affectation de chaque pixel à la radiale OU arc le plus proche en pixels.
    radial_assign: list[list[int]] = [[] for _ in radial_thetas]
    arc_assign:    list[list[int]] = [[] for _ in arc_radii]
    for i, (theta, r) in enumerate(polar):
        best_d_rad = float('inf')
        best_j_rad = -1
        for j, theta_j in enumerate(radial_thetas):
            d_theta = abs((theta - theta_j + 180) % 360 - 180)
            # Distance pixel à la radiale = r * sin(Δθ) ≈ r * Δθ_rad pour Δθ petit.
            d_pix = r * math.radians(d_theta)
            if d_pix < best_d_rad:
                best_d_rad = d_pix
                best_j_rad = j
        best_d_arc = float('inf')
        best_k_arc = -1
        for k, r_k in enumerate(arc_radii):
            d_pix = abs(r - r_k)
            if d_pix < best_d_arc:
                best_d_arc = d_pix
                best_k_arc = k
        if best_d_rad <= best_d_arc:
            radial_assign[best_j_rad].append(i)
        else:
            arc_assign[best_k_arc].append(i)

    # 4. Construction des segments à partir des assignations.
    radials: list[dict] = []
    for j, theta_j in enumerate(radial_thetas):
        idxs = radial_assign[j]
        if not idxs:
            continue
        rs = [polar[i][1] for i in idxs]
        # Outliers : on retire les 2% extrêmes pour éviter les pixels-bruit.
        rs_sorted = sorted(rs)
        lo = rs_sorted[max(0, int(len(rs_sorted) * 0.02))]
        hi = rs_sorted[min(len(rs_sorted) - 1, int(len(rs_sorted) * 0.98))]
        radials.append({
            'type': 'radial',
            'theta': round(theta_j, 2),
            'rMin': round(lo, 1),
            'rMax': round(hi, 1),
            'pixels': len(idxs),
        })

    arcs: list[dict] = []
    for k, r_k in enumerate(arc_radii):
        idxs = arc_assign[k]
        if not idxs:
            continue
        ts = sorted(polar[i][0] for i in idxs)
        # Plus grand "trou" angulaire = arc complémentaire ; on prend l'arc minimal
        # qui couvre tous les θ (gestion wrap-around).
        gaps = [(ts[(i + 1) % len(ts)] - ts[i]) % 360 for i in range(len(ts))]
        big = int(np.argmax(gaps))
        t_end = ts[big]
        t_start = ts[(big + 1) % len(ts)]
        arcs.append({
            'type': 'arc',
            'r': round(r_k, 1),
            'thetaStart': round(t_start, 2),
            'thetaEnd': round(t_end, 2),
            'pixels': len(idxs),
        })

    return radials + arcs


def fuse_shared(per_segmentum: dict[str, list[dict]],
                neighbours: list[tuple[str, str]]) -> dict[tuple[str, str], list[dict]]:
    """
    Pour chaque paire de Segmenta voisins, identifie les segments partagés
    (même θ pour radials, même r pour arcs) et les fusionne (moyennes).
    Retourne un dict {(a,b): [{type, params, ...}, ...]} listant les frontières
    communes par paire.
    """
    shared: dict[tuple[str, str], list[dict]] = {}
    for a, b in neighbours:
        match: list[dict] = []
        for sa in per_segmentum.get(a, []):
            for sb in per_segmentum.get(b, []):
                if sa['type'] != sb['type']:
                    continue
                if sa['type'] == 'radial':
                    dt = abs((sa['theta'] - sb['theta'] + 180) % 360 - 180)
                    if dt < 8 and max(sa['rMin'], sb['rMin']) <= min(sa['rMax'], sb['rMax']) + 50:
                        match.append({
                            'type': 'radial',
                            'theta': round((sa['theta'] + sb['theta']) / 2, 2),
                            'rMin': round((sa['rMin'] + sb['rMin']) / 2, 1),
                            'rMax': round((sa['rMax'] + sb['rMax']) / 2, 1),
                            'between': [a, b],
                        })
                elif sa['type'] == 'arc':
                    dr = abs(sa['r'] - sb['r'])
                    if dr < 50:
                        match.append({
                            'type': 'arc',
                            'r': round((sa['r'] + sb['r']) / 2, 1),
                            'thetaStart': round((sa['thetaStart'] + sb['thetaStart']) / 2, 2),
                            'thetaEnd':   round((sa['thetaEnd']   + sb['thetaEnd'])   / 2, 2),
                            'between': [a, b],
                        })
        if match:
            shared[(a, b)] = match
    return shared


# ---------- Compression : pixels classifiés -> segments canon (v1, conservé) ----------

# Filtrage des runs : on ignore les "runs" trop courts (= bruit). Un run
# vraiment significatif d'une bordure d'un Segmentum compte typiquement >= 30 px.
MIN_RUN_PIXELS = 25

# Tolérances de fusion entre segments voisins (frontières partagées).
RADIAL_SHARE_THETA_TOL_DEG = 4.0
ARC_SHARE_R_TOL_PX = 25.0


def runs_from_kinds(kinds: list[str], pts: list[tuple[float, float]]) -> list[dict]:
    """
    Walk the (closed) contour and group consecutive same-kind pixels into runs.
    Each run becomes one canon segment :
       radial -> {type:'radial', theta, rMin, rMax, pts: [...]}
       arc    -> {type:'arc',    r,   thetaStart, thetaEnd, pts: [...]}
       border -> {type:'border', pts: [...]}
       other  -> dropped if length < MIN_RUN_PIXELS, else kept as 'other'
    """
    n = len(pts)
    if n == 0:
        return []
    # Identify run boundaries on the closed contour : start at the first pixel
    # that follows a different-kind pixel, then iterate exactly n steps.
    start = 0
    for i in range(n):
        if kinds[(i - 1) % n] != kinds[i]:
            start = i
            break
    runs: list[dict] = []
    cur_kind = kinds[start]
    cur_idx = [start]
    for k in range(1, n):
        i = (start + k) % n
        if kinds[i] == cur_kind:
            cur_idx.append(i)
        else:
            runs.append({'kind': cur_kind, 'idx': cur_idx})
            cur_kind = kinds[i]
            cur_idx = [i]
    runs.append({'kind': cur_kind, 'idx': cur_idx})

    # Filter & convert to canon segments.
    segments: list[dict] = []
    for run in runs:
        idx = run['idx']
        if len(idx) < MIN_RUN_PIXELS and run['kind'] != 'border':
            continue
        run_pts = [pts[i] for i in idx]
        polar = [to_polar(x, y) for (x, y) in run_pts]
        if run['kind'] == 'radial':
            # Median theta is robust ; rMin/rMax along the run.
            thetas = sorted(t for (t, _) in polar)
            radii = [r for (_, r) in polar]
            theta = thetas[len(thetas) // 2]
            segments.append({
                'type': 'radial',
                'theta': round(theta, 2),
                'rMin': round(min(radii), 1),
                'rMax': round(max(radii), 1),
                'pixels': len(idx),
                'pts': [(round(x, 1), round(y, 1)) for x, y in (run_pts[0], run_pts[-1])],
            })
        elif run['kind'] == 'arc':
            radii = sorted(r for (_, r) in polar)
            r_med = radii[len(radii) // 2]
            thetas = [t for (t, _) in polar]
            # Smallest arc covering the thetas (handle wrap around 360°).
            ts = sorted(thetas)
            gaps = [(ts[(i + 1) % len(ts)] - ts[i]) % 360 for i in range(len(ts))]
            big = int(np.argmax(gaps))
            t_end = ts[big]
            t_start = ts[(big + 1) % len(ts)]
            segments.append({
                'type': 'arc',
                'r': round(r_med, 1),
                'thetaStart': round(t_start, 2),
                'thetaEnd': round(t_end, 2),
                'pixels': len(idx),
                'pts': [(round(x, 1), round(y, 1)) for x, y in (run_pts[0], run_pts[-1])],
            })
        elif run['kind'] == 'border':
            segments.append({
                'type': 'border',
                'pts': [(round(x, 1), round(y, 1)) for x, y in (run_pts[0], run_pts[-1])],
                'pixels': len(idx),
            })
        else:  # other — gardé pour debug
            segments.append({
                'type': 'other',
                'pts': [(round(x, 1), round(y, 1)) for x, y in (run_pts[0], run_pts[-1])],
                'pixels': len(idx),
            })
    return segments


def detect_shared_borders(per_segmentum: dict[str, list[dict]]) -> set[tuple[str, int]]:
    """
    For every pair of Segmenta, find segments that match in geometry (radials
    at the same theta, arcs at the same r). Return the set of (segmentum_id,
    segment_index) tuples that are SHARED with at least one other Segmentum.
    """
    shared: set[tuple[str, int]] = set()
    keys = list(per_segmentum.keys())
    for i, a_id in enumerate(keys):
        for b_id in keys[i + 1:]:
            for ai, asg in enumerate(per_segmentum[a_id]):
                for bi, bsg in enumerate(per_segmentum[b_id]):
                    if asg['type'] != bsg['type']:
                        continue
                    if asg['type'] == 'radial':
                        dt = abs((asg['theta'] - bsg['theta'] + 180) % 360 - 180)
                        if dt < RADIAL_SHARE_THETA_TOL_DEG and \
                           max(asg['rMin'], bsg['rMin']) <= min(asg['rMax'], bsg['rMax']) + 30:
                            shared.add((a_id, ai))
                            shared.add((b_id, bi))
                    elif asg['type'] == 'arc':
                        dr = abs(asg['r'] - bsg['r'])
                        if dr < ARC_SHARE_R_TOL_PX:
                            # arcs partagent un range theta non vide ?
                            ats = (asg['thetaStart'], asg['thetaEnd'])
                            bts = (bsg['thetaStart'], bsg['thetaEnd'])
                            # sufficient heuristic : si les centres tomb proches.
                            ac = ((ats[0] + ats[1]) / 2) % 360
                            bc = ((bts[0] + bts[1]) / 2) % 360
                            dc = abs((ac - bc + 180) % 360 - 180)
                            if dc < 30:  # arcs proches angulairement
                                shared.add((a_id, ai))
                                shared.add((b_id, bi))
    return shared


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]
    R, G, B = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)

    # Debug canvas — start from a darkened source for context.
    overlay = (img * 0.35).astype(np.uint8)
    # Mark Terra.
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 2)
    cv2.circle(overlay, TERRA, 3, (255, 215, 0), -1)

    counters = {'radial': 0, 'arc': 0, 'other': 0, 'border': 0}
    summary_lines = []

    for name, spec in SEGMENTA.items():
        mask_full = spec['mask'](R, G, B)
        mask_lcc = keep_largest_cc(mask_full)
        mask_lcc = clean_mask(mask_lcc, kernel_size=15)
        contour = extract_contour(mask_lcc)
        if contour is None:
            print(f'[{name}] no contour found, skipping')
            continue

        # Step 1 : densify contour by inserting interpolation points whenever a
        # pair of vertex pixels is too far apart (> 6px) to keep classification
        # robust at high curvature regions.
        pts = []
        for i in range(len(contour)):
            x1, y1 = contour[i]
            x2, y2 = contour[(i + 1) % len(contour)]
            pts.append((x1, y1))
            d = math.hypot(x2 - x1, y2 - y1)
            if d > 6:
                steps = int(d // 3)
                for s in range(1, steps):
                    t = s / steps
                    pts.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))

        # Step 2a : classify every pixel via local tangent alignment.
        n = len(pts)
        kinds = [classify_pixel(pts, i) for i in range(n)]

        # Step 2b : marquer "border" les pixels collés à un bord de la map
        # (à <BORDER_TOL_PX du rect [0,W]×[0,H]). Ces pixels suivent le rectangle,
        # pas la règle radial/arc — c'est le crop attendu.
        BORDER_TOL = 6
        for i in range(n):
            x, y = pts[i]
            if x < BORDER_TOL or x > W - BORDER_TOL or y < BORDER_TOL or y > H - BORDER_TOL:
                kinds[i] = 'border'

        # Step 2c : smoothing — pour chaque pixel "other" entouré majoritairement
        # de radial OU d'arc, on l'absorbe en celui de ses voisins. Réparation
        # itérative jusqu'à stabilité (ou max 5 passes pour ne pas trop lisser).
        SMOOTH_RADIUS = 4
        for _ in range(5):
            changed = 0
            new_kinds = list(kinds)
            for i in range(n):
                if kinds[i] != 'other':
                    continue
                window = [kinds[(i + d) % n] for d in range(-SMOOTH_RADIUS, SMOOTH_RADIUS + 1) if d != 0]
                rad = window.count('radial')
                arc = window.count('arc')
                bd  = window.count('border')
                # Vote majoritaire ; on n'absorbe que si la majorité est claire (>=60%).
                total = rad + arc + bd
                if total >= int(0.6 * (2 * SMOOTH_RADIUS)):
                    if rad > arc and rad > bd:
                        new_kinds[i] = 'radial'; changed += 1
                    elif arc > rad and arc > bd:
                        new_kinds[i] = 'arc'; changed += 1
                    elif bd > rad and bd > arc:
                        new_kinds[i] = 'border'; changed += 1
            kinds = new_kinds
            if changed == 0:
                break

        local = {'radial': 0, 'arc': 0, 'other': 0, 'border': 0}
        for i in range(n):
            kind = kinds[i]
            local[kind] += 1
            counters[kind] = counters.get(kind, 0) + 1
            x1, y1 = int(pts[i][0]), int(pts[i][1])
            x2, y2 = int(pts[(i + 1) % n][0]), int(pts[(i + 1) % n][1])
            color = {'radial': (0, 255, 255),       # cyan
                     'arc':    (255, 0, 255),       # magenta
                     'other':  (255, 50, 50),       # rouge
                     'border': (255, 215, 0)}[kind] # or = bord map (canon : cropped)
            cv2.line(overlay, (x1, y1), (x2, y2), color, 3)

        total = sum(local.values())
        good = local['radial'] + local['arc'] + local['border']
        pct = (100 * good / total) if total else 0
        summary_lines.append(
            f'[{name:10s}] edges={total:5d}  radial={local["radial"]:5d}  arc={local["arc"]:5d}  '
            f'border={local["border"]:5d}  other={local["other"]:5d}  canon={pct:5.1f}%'
        )
        print(summary_lines[-1])

    print('\n=== TOTAL ===')
    tot = sum(counters.values())
    if tot:
        good = counters['radial'] + counters['arc'] + counters['border']
        print(
            f'edges={tot}  radial={counters["radial"]}  arc={counters["arc"]}  '
            f'border={counters["border"]}  other={counters["other"]}  canon={100*good/tot:.1f}%'
        )

    Image.fromarray(overlay).save(OUT_DIR / 'overlay-full.png')

    # === Phase 4 : compression contour pixels -> canon segments + dédup ===
    print('\n=== Compression vers segments canon ===')
    per_segmentum: dict[str, list[dict]] = {}
    pts_cache: dict[str, list[tuple[float, float]]] = {}
    kinds_cache: dict[str, list[str]] = {}
    for name, spec in SEGMENTA.items():
        mask_full = spec['mask'](R, G, B)
        mask_lcc = keep_largest_cc(mask_full)
        mask_lcc = clean_mask(mask_lcc, kernel_size=15)
        contour = extract_contour(mask_lcc)
        if contour is None:
            continue
        # Re-densifier (même logique que phase 1).
        pts = []
        for i in range(len(contour)):
            x1, y1 = contour[i]
            x2, y2 = contour[(i + 1) % len(contour)]
            pts.append((float(x1), float(y1)))
            d = math.hypot(x2 - x1, y2 - y1)
            if d > 6:
                steps = int(d // 3)
                for s in range(1, steps):
                    t = s / steps
                    pts.append((x1 + t * (x2 - x1), y1 + t * (y2 - y1)))
        n = len(pts)
        kinds = [classify_pixel(pts, i) for i in range(n)]
        BORDER_TOL = 6
        for i in range(n):
            x, y = pts[i]
            if x < BORDER_TOL or x > W - BORDER_TOL or y < BORDER_TOL or y > H - BORDER_TOL:
                kinds[i] = 'border'
        # smoothing
        SMOOTH_RADIUS = 4
        for _ in range(5):
            changed = 0
            new_kinds = list(kinds)
            for i in range(n):
                if kinds[i] != 'other':
                    continue
                window = [kinds[(i + d) % n] for d in range(-SMOOTH_RADIUS, SMOOTH_RADIUS + 1) if d != 0]
                rad = window.count('radial'); arc = window.count('arc'); bd = window.count('border')
                total = rad + arc + bd
                if total >= int(0.6 * (2 * SMOOTH_RADIUS)):
                    if rad >= arc and rad >= bd:
                        new_kinds[i] = 'radial'; changed += 1
                    elif arc >= bd:
                        new_kinds[i] = 'arc'; changed += 1
                    else:
                        new_kinds[i] = 'border'; changed += 1
            kinds = new_kinds
            if changed == 0:
                break
        n_radial = spec['nRadial']
        n_arc = spec['nArc']
        segments = compress_segmentum(name, pts, kinds, n_radial, n_arc)
        per_segmentum[name] = segments
        pts_cache[name] = pts
        kinds_cache[name] = kinds
        types_count = {'radial': 0, 'arc': 0}
        for s in segments:
            types_count[s['type']] = types_count.get(s['type'], 0) + 1
        print(f'  {name:10s} {len(segments):2d} segments  '
              f'(radial={types_count.get("radial", 0)}/{n_radial} '
              f'arc={types_count.get("arc", 0)}/{n_arc})')

    # Frontières partagées via topologie connue + matching params
    shared_map = fuse_shared(per_segmentum, NEIGHBOURS)
    n_shared = sum(len(v) for v in shared_map.values())
    print(f'\nFrontières partagées (topologie {len(NEIGHBOURS)} paires de voisins) : {n_shared} segments fusionnés')
    for (a, b), segs in shared_map.items():
        print(f'  {a:10s} ↔ {b:10s} : {len(segs)} segment(s) commun(s)')
    shared = set()  # legacy, gardé pour compat avec la sérialisation JSON ci-dessous

    # JSON output
    out_json: dict = {
        'terra': list(TERRA),
        'imageSize': [W, H],
        'segmenta': [],
    }
    for name, segments in per_segmentum.items():
        out_json['segmenta'].append({
            'id': name,
            'segments': [
                {**s, 'sharedWith': [other for (other, oi) in shared
                                     if other != name
                                     for (_, m) in [(name, segments.index(s))] if (other, oi) in shared]
                                     if (name, segments.index(s)) in shared else []}
                for s in segments
            ],
        })
    (OUT_DIR / 'segmenta.json').write_text(json.dumps(out_json, indent=2))
    print(f'JSON écrit : {OUT_DIR}/segmenta.json')

    # === Phase 5 : re-rendu canon (= ce que l'app affichera) ===
    # Segments uniques après dédup via topologie : on dessine chaque radiale et
    # chaque arc une seule fois si partagés (entre 2 voisins). Le résultat = le
    # dessin "propre" : N radiales lisses + N arcs lisses par Segmentum.
    canon = (img * 0.35).astype(np.uint8)
    cv2.circle(canon, TERRA, 14, (255, 215, 0), 2)
    cv2.circle(canon, TERRA, 3, (255, 215, 0), -1)

    # Index de fusion : pour chaque (segmentum, segment) → indique s'il est partagé.
    pair_to_shared = shared_map  # alias

    def shared_of(name: str, seg: dict) -> dict | None:
        for (a, b), segs in pair_to_shared.items():
            if name not in (a, b):
                continue
            for sh in segs:
                if sh['type'] != seg['type']:
                    continue
                if seg['type'] == 'radial':
                    if abs((sh['theta'] - seg['theta'] + 180) % 360 - 180) < 4:
                        return sh
                else:
                    if abs(sh['r'] - seg['r']) < 25:
                        return sh
            return None
        return None

    drawn_keys: set[str] = set()

    def draw_radial(theta: float, rmin: float, rmax: float, color: tuple[int, int, int]) -> None:
        t = math.radians(theta)
        p1 = (int(TERRA[0] + rmin * math.cos(t)), int(TERRA[1] + rmin * math.sin(t)))
        p2 = (int(TERRA[0] + rmax * math.cos(t)), int(TERRA[1] + rmax * math.sin(t)))
        cv2.line(canon, p1, p2, color, 5, cv2.LINE_AA)

    def draw_arc(r: float, ts: float, te: float, color: tuple[int, int, int]) -> None:
        if te < ts:
            te += 360
        steps = max(60, int((te - ts) * 1.5))
        pts_arc = []
        for k in range(steps + 1):
            th = math.radians(ts + (te - ts) * k / steps)
            pts_arc.append((int(TERRA[0] + r * math.cos(th)), int(TERRA[1] + r * math.sin(th))))
        cv2.polylines(canon, [np.array(pts_arc, dtype=np.int32)], False, color, 5, cv2.LINE_AA)

    for name, segments in per_segmentum.items():
        for seg in segments:
            sh = shared_of(name, seg)
            if seg['type'] == 'radial':
                key = f'R|{round(seg["theta"])}'
                if sh is not None:
                    key = f'R|{round(sh["theta"])}'
                if key in drawn_keys:
                    continue
                drawn_keys.add(key)
                if sh is not None:
                    draw_radial(sh['theta'], sh['rMin'], sh['rMax'], (0, 255, 255))
                else:
                    draw_radial(seg['theta'], seg['rMin'], seg['rMax'], (0, 255, 255))
            elif seg['type'] == 'arc':
                key = f'A|{round(seg["r"]/15)}'
                if sh is not None:
                    key = f'A|{round(sh["r"]/15)}'
                if key in drawn_keys:
                    continue
                drawn_keys.add(key)
                if sh is not None:
                    draw_arc(sh['r'], sh['thetaStart'], sh['thetaEnd'], (255, 0, 255))
                else:
                    draw_arc(seg['r'], seg['thetaStart'], seg['thetaEnd'], (255, 0, 255))

    Image.fromarray(canon).save(OUT_DIR / 'canon-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(canon).resize((int(W*scale), int(H*scale)), Image.LANCZOS).save(OUT_DIR / 'canon-small.png')
    print(f'Re-rendu canon : {OUT_DIR}/canon-small.png  ({len(drawn_keys)} segments uniques tracés)')

    # Save a downsampled version (≤ 1800 px) safe for in-context viewing.
    scale = 1800 / max(W, H)
    small = Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    small.save(OUT_DIR / 'overlay-small.png')

    # Crop centered on Terra at ~1.5x its bbox for a closer look.
    crop_r = 900
    crop = Image.fromarray(overlay).crop(
        (max(0, TERRA[0] - crop_r), max(0, TERRA[1] - crop_r),
         min(W, TERRA[0] + crop_r), min(H, TERRA[1] + crop_r))
    )
    crop.save(OUT_DIR / 'overlay-terra-zoom.png')

    print(f'\nWrote: {OUT_DIR}/overlay-full.png  (full size)')
    print(f'       {OUT_DIR}/overlay-small.png  ({small.size})')
    print(f'       {OUT_DIR}/overlay-terra-zoom.png  ({crop.size})')


if __name__ == '__main__':
    main()
