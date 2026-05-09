"""
Detect canon Segmenta/Sector borders directly from the GW base map
(galaxy-map.jpg) — no user redraw needed. The map already has pale lines
drawn by GW : radials passing through Terra + arcs centered on Terra.

Pipeline :
  1. Load galaxy-map.jpg (3740x2300)
  2. Mask "pale" pixels = intensity above a threshold ; reject anything that's
     clearly text/markers (very saturated red, very dark, etc.)
  3. For each kept pixel, compute (θ, r) vs Terra (967, 1255)
  4. Histogram θ → peaks = candidate radials
  5. Histogram r → peaks = candidate arcs
  6. Render an overlay where every detected peak is drawn on the map
     (radials cyan, arcs magenta) so the user can validate visually.

Output : /tmp/seg/canon-lines.png + console summary of peak parameters.
"""
from __future__ import annotations
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

SRC = Path('/home/sylvain_ladoire/projects/developpeur/warhammer40k/frontend/public/galaxy-map.jpg')
OUT = Path('/tmp/seg')
OUT.mkdir(parents=True, exist_ok=True)
TERRA = (967, 1255)


def main() -> None:
    img = np.array(Image.open(SRC))
    H, W = img.shape[:2]
    R, G, B = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)
    grey = ((R + G + B) / 3).astype(np.uint8)

    # Pixels « pâles » : intensité moyenne haute, faible saturation rouge
    # (pour éviter le rouge vif des labels Cicatrix / icônes).
    pale = (grey > 130) & (grey < 230) & (np.abs(R - G) < 40) & (np.abs(R - B) < 50)
    # On ignore les zones très sombres + les pure black borders du JPEG.
    pale &= grey > 100
    # Distance-from-Terra cap : on ne s'intéresse qu'aux pixels dans un rayon
    # raisonnable (la map fait 3043 px de Terra au coin).
    ys, xs = np.where(pale)
    dx = xs - TERRA[0]
    dy = ys - TERRA[1]
    r = np.hypot(dx, dy)
    keep = (r > 50) & (r < 3000)
    xs, ys, dx, dy, r = xs[keep], ys[keep], dx[keep], dy[keep], r[keep]
    theta = (np.degrees(np.arctan2(dy, dx)) + 360) % 360
    print(f'pale pixels kept : {len(xs):,}')

    # Histogramme circulaire des θ (bins de 0.5°)
    bins_t = 720
    hist_t, edges_t = np.histogram(theta, bins=bins_t, range=(0, 360))
    # Histogramme des r (bins de 5px)
    bins_r = max(50, int(r.max() / 5))
    hist_r, edges_r = np.histogram(r, bins=bins_r, range=(0, 5 * bins_r))

    # Lissage léger pour stabiliser les pics
    def smooth(h: np.ndarray, w: int = 5) -> np.ndarray:
        kernel = np.ones(w) / w
        return np.convolve(h, kernel, mode='same')
    hist_t_s = smooth(hist_t, 5)
    hist_r_s = smooth(hist_r, 7)

    def find_peaks(hist: np.ndarray, n: int, min_sep: int, threshold_ratio: float = 0.2) -> list[int]:
        max_v = hist.max()
        thr = max_v * threshold_ratio
        picked: list[int] = []
        blocked = np.zeros(len(hist), dtype=bool)
        order = np.argsort(-hist)
        for idx in order:
            if hist[idx] < thr:
                break
            if blocked[idx]:
                continue
            picked.append(int(idx))
            for d in range(-min_sep, min_sep + 1):
                blocked[(idx + d) % len(hist)] = True
            if len(picked) >= n:
                break
        return picked

    peaks_t_idx = find_peaks(hist_t_s, n=20, min_sep=8, threshold_ratio=0.30)
    peaks_r_idx = find_peaks(hist_r_s, n=15, min_sep=4, threshold_ratio=0.30)
    peaks_theta = sorted([float((edges_t[p] + edges_t[p + 1]) / 2) for p in peaks_t_idx])
    peaks_r = sorted([float((edges_r[p] + edges_r[p + 1]) / 2) for p in peaks_r_idx])

    print(f'\n{len(peaks_theta)} pics radiales (θ° depuis Terra) :')
    for t in peaks_theta:
        print(f'  θ = {t:6.1f}°')
    print(f'\n{len(peaks_r)} pics arcs (r en px depuis Terra) :')
    for rv in peaks_r:
        print(f'  r = {rv:6.0f}px')

    # === Overlay : tracer chaque pic sur la map ===
    overlay = (img * 0.55).astype(np.uint8)
    cv2.circle(overlay, TERRA, 14, (255, 215, 0), 3)

    # Radiales cyan (du centre jusqu'au rayon max)
    for t in peaks_theta:
        rad = math.radians(t)
        x2 = int(TERRA[0] + 3000 * math.cos(rad))
        y2 = int(TERRA[1] + 3000 * math.sin(rad))
        # crop au rect map manuellement
        cv2.line(overlay, TERRA, (x2, y2), (0, 255, 255), 3, cv2.LINE_AA)

    # Arcs magenta (cercle complet, sera visuellement clippé par viewport)
    for rv in peaks_r:
        cv2.circle(overlay, TERRA, int(rv), (255, 0, 255), 3, cv2.LINE_AA)

    Image.fromarray(overlay).save(OUT / 'canon-lines-full.png')
    scale = 1800 / max(W, H)
    Image.fromarray(overlay).resize((int(W * scale), int(H * scale)), Image.LANCZOS).save(
        OUT / 'canon-lines-small.png'
    )
    print(f'\nOverlay : {OUT}/canon-lines-small.png')


if __name__ == '__main__':
    main()
