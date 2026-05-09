"""
Approche minimale : pour chaque zone colorée, on prend son contour, on le
simplifie (Douglas-Peucker), on l'affiche tel quel et on sort le JSON.

Pas de classification, pas de pics, pas de k-means. Juste les bordures des
zones telles que dessinées.
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

# Douglas-Peucker tolerance en pixels. 2.5 = densité suffisante pour des arcs
# qui restent visuellement lisses (pas d'heurtement sur les courbes).
DP_EPSILON = 2.5


def keep_largest_cc(mask: np.ndarray) -> np.ndarray:
    n, lbl, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n <= 1:
        return mask
    largest = 1 + int(np.argmax(stats[1:, 4]))
    return lbl == largest


def fill_holes_cv(mask: np.ndarray) -> np.ndarray:
    """Bouche tous les trous internes (sans scipy) via flood-fill du fond + complément."""
    m = mask.astype(np.uint8)
    H, W = m.shape
    flooded = m.copy()
    ff_mask = np.zeros((H + 2, W + 2), np.uint8)
    cv2.floodFill(flooded, ff_mask, (0, 0), 1)
    # `flooded` a maintenant 1 partout sauf dans les trous internes encore à 0.
    holes = (flooded == 0)
    return (m | holes.astype(np.uint8)).astype(bool)


def clean_mask(mask: np.ndarray, k: int = 15) -> np.ndarray:
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    m = cv2.morphologyEx(mask.astype(np.uint8), cv2.MORPH_OPEN, kernel)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    m = fill_holes_cv(m.astype(bool))
    return m


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]
    R, G, B = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)

    # Phase 1 : masks bruts par Segmentum
    raw_masks: dict[str, np.ndarray] = {}
    for name, spec in SEGMENTA.items():
        m = spec['mask'](R, G, B)
        m = keep_largest_cc(m)
        m = clean_mask(m, 15)
        raw_masks[name] = m
        print(f'  {name:10s} mask brut : {int(m.sum()):>9d} px')

    # Phase 2 : zone "galaxie globale" = union des 5 masks dilatés + fill_holes.
    # Tous les pixels à l'intérieur de cette zone seront attribués à un Segmentum.
    union = np.zeros_like(next(iter(raw_masks.values())))
    for m in raw_masks.values():
        union |= m
    kernel_big = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (51, 51))
    galaxy = cv2.morphologyEx(union.astype(np.uint8), cv2.MORPH_CLOSE, kernel_big)
    galaxy = fill_holes_cv(galaxy.astype(bool))
    print(f'\nZone galaxy globale : {int(galaxy.sum()):>9d} px')

    # Phase 3 : watershed distance-based — chaque pixel de `galaxy` non couvert
    # par un mask brut est attribué au Segmentum dont le mask brut est le plus
    # proche (transformée de distance euclidienne).
    names = list(raw_masks.keys())
    dists = []
    for n in names:
        inv = (~raw_masks[n]).astype(np.uint8)
        dt = cv2.distanceTransform(inv, cv2.DIST_L2, 5)
        dists.append(dt)
    dists = np.stack(dists, axis=0)  # K x H x W
    nearest = np.argmin(dists, axis=0)  # H x W → indice de Segmentum
    final_masks: dict[str, np.ndarray] = {}
    for i, n in enumerate(names):
        final_masks[n] = (nearest == i) & galaxy

    # Phase 4 : extraire contour simplifié de chaque mask final
    out_segmenta: dict[str, list[list[int]]] = {}
    overlay = (img * 0.45).astype(np.uint8)
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 3)
    cv2.circle(overlay, TERRA, 3, (255, 215, 0), -1)

    for name, m in final_masks.items():
        contours, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if not contours:
            continue
        contour = max(contours, key=cv2.contourArea)
        simplified = cv2.approxPolyDP(contour, DP_EPSILON, True).reshape(-1, 2)
        out_segmenta[name] = simplified.tolist()
        col = SEGMENTA[name]['color']
        cv2.polylines(overlay, [simplified.reshape(-1, 1, 2)], True, col, 6, cv2.LINE_AA)
        for (x, y) in simplified:
            cv2.circle(overlay, (int(x), int(y)), 5, (255, 215, 0), -1)
        print(f'  {name:10s} : {len(simplified):3d} vertices  ({int(m.sum())} px attribués)')

    Image.fromarray(overlay).save(OUT / 'simple-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS).save(
        OUT / 'simple-small.png')
    print(f'\nOverlay : {OUT}/simple-small.png')

    json_out = {
        'terra': list(TERRA),
        'imageSize': [W, H],
        'segmenta': out_segmenta,
    }
    (OUT / 'simple.json').write_text(json.dumps(json_out, indent=2))
    print(f'JSON : {OUT}/simple.json')


if __name__ == '__main__':
    main()
