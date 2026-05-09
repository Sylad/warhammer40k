"""
v4 — fit canon geometry per neighbour pair, then reconstruct clean wedges.

Approche définitive :
  1. Mask + watershed → chaque pixel de la galaxy attribué à 1 Segmentum
  2. Pour chaque paire de voisins (Solar↔outer × 4, outer↔outer × 4) :
       - Compute frontier pixels (pixels où le mask change entre les 2)
       - Si l'un est Solar → fit cercle centré sur Terra : r = mean(distances)
         (donne le rayon canon r_solar, partagé entre les 4 paires Solar/outer)
       - Sinon outer↔outer → fit droite passant par Terra : θ = atan2 médian
         des pixels frontière (passe par Terra par construction radiale)
  3. Build canon polygons :
       - Solar = disque parfait centré Terra, rayon r_solar
       - Chaque outer = wedge entre ses 2 θ-frontières latérales,
         entre r_solar (intérieur) et R_OUTER (extérieur), clippé au rect map

Pas de zigzag, pas de zigouigou. Juste : 1 cercle Solar + 4 wedges radials nets.
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
                  'color': (224, 160, 64)},
    'tempestus': {'mask': lambda r, g, b: (g > 180) & (r < 120) & (b < 120),
                  'color': (32, 224, 64)},
    'ultima':    {'mask': lambda r, g, b: (b > 180) & (g > 150) & (r < 200) & (r > 80),
                  'color': (128, 192, 224)},
    'pacificus': {'mask': lambda r, g, b: (r > 180) & (g < 60) & (b < 60),
                  'color': (224, 0, 0)},
    'obscurus':  {'mask': lambda r, g, b: (r > 80) & (r < 200) & (g < 60) & (b > 180),
                  'color': (128, 0, 224)},
}

# Topologie validée par l'utilisateur.
NEIGHBOURS = [
    ('solar', 'pacificus'),
    ('solar', 'tempestus'),
    ('solar', 'ultima'),
    ('solar', 'obscurus'),
    ('pacificus', 'tempestus'),
    ('tempestus', 'ultima'),
    ('ultima', 'obscurus'),
    ('obscurus', 'pacificus'),
]
OUTERS = ['pacificus', 'tempestus', 'ultima', 'obscurus']
R_OUTER_INFINITY = 3500  # plus que la diagonale de la map (3043 max), assure le crop


def keep_largest_cc(mask: np.ndarray) -> np.ndarray:
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    largest = 1 + int(np.argmax(stats[1:, 4]))
    return lbl == largest


def fill_holes_cv(mask: np.ndarray) -> np.ndarray:
    m = mask.astype(np.uint8)
    H, W = m.shape
    flooded = m.copy()
    ff = np.zeros((H + 2, W + 2), np.uint8)
    cv2.floodFill(flooded, ff, (0, 0), 1)
    holes = (flooded == 0)
    return (m | holes.astype(np.uint8)).astype(bool)


def clean_mask(mask: np.ndarray, k: int = 15) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    return fill_holes_cv(m.astype(bool))


def watershed_attribution(masks: dict[str, np.ndarray], names: list[str]) -> tuple[np.ndarray, np.ndarray]:
    """
    Pour chaque pixel : attribué au Segmentum dont le mask brut est le plus
    proche. Retourne (label_image, galaxy_mask) où galaxy_mask est l'union
    dilatée + fill_holes (zone valide pour l'attribution).
    """
    union = np.zeros_like(next(iter(masks.values())))
    for m in masks.values():
        union |= m
    kbig = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))
    galaxy = cv2.morphologyEx(union.astype(np.uint8), cv2.MORPH_CLOSE, kbig)
    galaxy = fill_holes_cv(galaxy.astype(bool))
    dists = []
    for n in names:
        inv = (~masks[n]).astype(np.uint8)
        dt = cv2.distanceTransform(inv, cv2.DIST_L2, 5)
        dists.append(dt)
    dists = np.stack(dists, axis=0)
    label = np.argmin(dists, axis=0).astype(np.int32)
    label[~galaxy] = -1
    return label, galaxy


def frontier_pixels(label: np.ndarray, idx_a: int, idx_b: int) -> np.ndarray:
    """Pixels label==a qui touchent (8-voisinage) un pixel label==b."""
    mask_a = (label == idx_a).astype(np.uint8)
    mask_b = (label == idx_b).astype(np.uint8)
    # Dilate b puis intersect avec a → pixels de a au contact de b.
    dilated_b = cv2.dilate(mask_b, np.ones((3, 3), np.uint8))
    contact = mask_a & dilated_b
    ys, xs = np.where(contact > 0)
    return np.stack([xs, ys], axis=1) if len(xs) else np.empty((0, 2), dtype=int)


def to_polar(xs: np.ndarray, ys: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    dx = xs - TERRA[0]
    dy = ys - TERRA[1]
    return (np.degrees(np.arctan2(dy, dx)) + 360) % 360, np.hypot(dx, dy)


def fit_radial(theta: np.ndarray) -> float:
    """θ canon = atan2 du vecteur moyen unit (gestion wrap)."""
    rad = np.radians(theta)
    return float((math.degrees(math.atan2(np.mean(np.sin(rad)), np.mean(np.cos(rad)))) + 360) % 360)


def fit_arc_radius(r: np.ndarray) -> float:
    """r canon = médiane des distances à Terra."""
    return float(np.median(r))


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]
    R, G, B = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)

    # Phase 1 : masks bruts par Segmentum
    raw: dict[str, np.ndarray] = {}
    for name, spec in SEGMENTA.items():
        m = spec['mask'](R, G, B)
        m = keep_largest_cc(m)
        m = clean_mask(m, 15)
        raw[name] = m
    names = list(raw.keys())
    label, galaxy = watershed_attribution(raw, names)
    print(f'Galaxy mask : {int(galaxy.sum()):,} px')

    # Phase 2 : fitter chaque frontière voisine
    fits: dict[tuple[str, str], dict] = {}
    r_solar_candidates: list[float] = []
    for a, b in NEIGHBOURS:
        ia, ib = names.index(a), names.index(b)
        # Pixels frontière côté A (et côté B) → on combine les deux pour avoir
        # plus de support et symétriser le fit.
        f_ab = frontier_pixels(label, ia, ib)
        f_ba = frontier_pixels(label, ib, ia)
        front = np.concatenate([f_ab, f_ba]) if len(f_ab) and len(f_ba) else (f_ab if len(f_ab) else f_ba)
        if len(front) < 30:
            print(f'  {a:10s} ↔ {b:10s} : <30 px frontière, skip')
            continue
        theta, r = to_polar(front[:, 0], front[:, 1])
        is_solar_pair = ('solar' in (a, b))
        if is_solar_pair:
            r_canon = fit_arc_radius(r)
            r_solar_candidates.append(r_canon)
            fits[(a, b)] = {'type': 'arc', 'r': r_canon, 'pixels': len(front)}
            print(f'  {a:10s} ↔ {b:10s} : ARC fit r={r_canon:.1f} px ({len(front)} px)')
        else:
            t_canon = fit_radial(theta)
            fits[(a, b)] = {'type': 'radial', 'theta': t_canon, 'pixels': len(front)}
            print(f'  {a:10s} ↔ {b:10s} : RAD fit θ={t_canon:.1f}° ({len(front)} px)')

    # Phase 3 : r_solar canon = moyenne pondérée des 4 candidats Solar/outer
    if r_solar_candidates:
        r_solar = float(np.mean(r_solar_candidates))
    else:
        r_solar = 320.0
    print(f'\nR_SOLAR canon (moyenne 4 fits) = {r_solar:.1f} px')

    # Phase 4 : pour chaque outer, identifier ses 2 frontières radiales latérales
    # (= les 2 paires NEIGHBOURS qui contiennent cet outer SANS Solar).
    outer_thetas: dict[str, list[float]] = {n: [] for n in OUTERS}
    for (a, b), fit in fits.items():
        if fit['type'] != 'radial':
            continue
        # Cette paire (a, b) est entre 2 outers — affecte les 2.
        outer_thetas[a].append(fit['theta'])
        outer_thetas[b].append(fit['theta'])
    # Trier les 2 thetas par angle pour avoir [theta_min, theta_max] dans le sens
    # naturel ; gérer le wrap (ex Ultima qui pourrait wrap autour de 0°).
    out_segmenta: dict[str, dict] = {}
    out_segmenta['solar'] = {'kind': 'disc', 'rSolar': round(r_solar, 1)}
    for name in OUTERS:
        ths = outer_thetas[name]
        if len(ths) != 2:
            print(f'  WARNING : {name} a {len(ths)} radiales (attendu 2)')
            continue
        t1, t2 = sorted(ths)
        # Pour décider si le wedge est sur l'arc court [t1→t2] ou long [t2→t1+360],
        # on regarde le mask : sa centroïde nous dit quel arc le wedge couvre.
        ys, xs = np.where(label == names.index(name))
        cx, cy = float(xs.mean()), float(ys.mean())
        cth = (math.degrees(math.atan2(cy - TERRA[1], cx - TERRA[0])) + 360) % 360
        # L'arc qui contient cth est le bon.
        if t1 <= cth <= t2:
            theta_start, theta_end = t1, t2
        else:
            theta_start, theta_end = t2, t1  # wrap
        out_segmenta[name] = {
            'kind': 'wedge',
            'thetaStart': round(theta_start, 2),
            'thetaEnd': round(theta_end, 2),
            'rInner': round(r_solar, 1),
            'rOuter': R_OUTER_INFINITY,
        }
        print(f'  {name:10s} : wedge θ {theta_start:.1f}° → {theta_end:.1f}°')

    # Phase 5 : render canon polygons (cropped to map rect) en SEMI-TRANSPARENT
    # par-dessus le dessin user pour valider l'alignement.
    overlay = img.copy()
    fill_layer = np.zeros_like(img)
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 3)

    def crop_polygon_to_rect(poly: list[tuple[float, float]]) -> list[tuple[int, int]]:
        # Sutherland-Hodgman simple
        def clip(pts: list[tuple[float, float]], edge: str) -> list[tuple[float, float]]:
            out = []
            n = len(pts)
            for i in range(n):
                a = pts[(i - 1) % n]
                b = pts[i]
                a_in = inside(a, edge)
                b_in = inside(b, edge)
                if b_in:
                    if not a_in:
                        out.append(intersect(a, b, edge))
                    out.append(b)
                elif a_in:
                    out.append(intersect(a, b, edge))
            return out

        def inside(p, e):
            x, y = p
            return {'L': x >= 0, 'R': x <= W, 'T': y >= 0, 'B': y <= H}[e]

        def intersect(a, b, e):
            ax, ay = a; bx, by = b
            if e == 'L':
                t = (0 - ax) / (bx - ax) if bx != ax else 0
                return (0, ay + t * (by - ay))
            if e == 'R':
                t = (W - ax) / (bx - ax) if bx != ax else 0
                return (W, ay + t * (by - ay))
            if e == 'T':
                t = (0 - ay) / (by - ay) if by != ay else 0
                return (ax + t * (bx - ax), 0)
            t = (H - ay) / (by - ay) if by != ay else 0
            return (ax + t * (bx - ax), H)

        out = poly
        for e in ['L', 'R', 'T', 'B']:
            out = clip(out, e)
            if not out:
                return []
        return [(int(round(x)), int(round(y))) for (x, y) in out]

    # Solar = disque
    solar_poly: list[tuple[float, float]] = []
    for k in range(180):
        th = math.radians(k * 2)
        solar_poly.append((TERRA[0] + r_solar * math.cos(th), TERRA[1] + r_solar * math.sin(th)))
    solar_clipped = crop_polygon_to_rect(solar_poly)
    if solar_clipped:
        cv2.fillPoly(fill_layer, [np.array(solar_clipped, np.int32)], SEGMENTA['solar']['color'])

    # Outers = wedges
    for name in OUTERS:
        if out_segmenta[name].get('kind') != 'wedge':
            continue
        seg = out_segmenta[name]
        ts, te = seg['thetaStart'], seg['thetaEnd']
        if te < ts:
            te += 360
        # Sample inner arc + outer arc
        N = 100
        poly: list[tuple[float, float]] = []
        # inner arc r=rInner, theta ts→te
        for k in range(N + 1):
            th = math.radians(ts + (te - ts) * k / N)
            poly.append((TERRA[0] + seg['rInner'] * math.cos(th), TERRA[1] + seg['rInner'] * math.sin(th)))
        # outer arc r=rOuter, theta te→ts
        for k in range(N + 1):
            th = math.radians(te - (te - ts) * k / N)
            poly.append((TERRA[0] + seg['rOuter'] * math.cos(th), TERRA[1] + seg['rOuter'] * math.sin(th)))
        clipped = crop_polygon_to_rect(poly)
        if clipped:
            col = SEGMENTA[name]['color']
            cv2.fillPoly(fill_layer, [np.array(clipped, np.int32)], col)

    # Blend semi-transparent overlay with original
    overlay = cv2.addWeighted(overlay, 0.55, fill_layer, 0.45, 0)
    # Stroke contours en jaune dessus pour bien voir les frontières canon.
    if solar_clipped:
        cv2.polylines(overlay, [np.array(solar_clipped, np.int32)], True, (255, 230, 0), 4, cv2.LINE_AA)
    for name in OUTERS:
        if out_segmenta[name].get('kind') != 'wedge':
            continue
        seg = out_segmenta[name]
        ts, te = seg['thetaStart'], seg['thetaEnd']
        if te < ts:
            te += 360
        N = 100
        poly = []
        for k in range(N + 1):
            th = math.radians(ts + (te - ts) * k / N)
            poly.append((TERRA[0] + seg['rInner'] * math.cos(th), TERRA[1] + seg['rInner'] * math.sin(th)))
        for k in range(N + 1):
            th = math.radians(te - (te - ts) * k / N)
            poly.append((TERRA[0] + seg['rOuter'] * math.cos(th), TERRA[1] + seg['rOuter'] * math.sin(th)))
        clipped = crop_polygon_to_rect(poly)
        if clipped:
            cv2.polylines(overlay, [np.array(clipped, np.int32)], True, (255, 230, 0), 4, cv2.LINE_AA)

    Image.fromarray(overlay).save(OUT / 'v4-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS).save(
        OUT / 'v4-small.png')
    print(f'\nOverlay : {OUT}/v4-small.png')

    out_json = {
        'terra': list(TERRA),
        'imageSize': [W, H],
        'rSolar': round(r_solar, 1),
        'rOuter': R_OUTER_INFINITY,
        'segmenta': out_segmenta,
    }
    (OUT / 'v4.json').write_text(json.dumps(out_json, indent=2))
    print(f'JSON : {OUT}/v4.json')


if __name__ == '__main__':
    main()
