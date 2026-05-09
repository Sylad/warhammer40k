#!/usr/bin/env python3
"""Detect Warhammer 40k canon GW galaxy map planet labels.

Pipeline :
1. Find bright text on dark OR red backgrounds (2-pass) → label cores.
2. Fuse multi-line labels (vertically adjacent, x-aligned).
3. Filter by area/aspect/dimensions.
4. Detect red battle X markers (saturated red circles).
5. For each label : OCR + find triangle tip + override with battle marker if nearby.
6. Output JSON {LABEL: [cx, cy]} on stdout.
"""
import argparse
import json
import sys

import cv2
import numpy as np

try:
    import pytesseract
    import shutil
    HAS_OCR = shutil.which('tesseract') is not None
    if not HAS_OCR:
        sys.stderr.write("WARN: tesseract binary missing → labels = LABEL_N\n")
except ImportError:
    HAS_OCR = False
    sys.stderr.write("WARN: pytesseract missing → labels = LABEL_N\n")


# ------------------------------------------------------------------ Detection

def find_text_regions(gray: np.ndarray, bgr: np.ndarray,
                       min_area=100, min_w=25, min_h=8,
                       max_w=350, max_h=60, aspect_min=1.3, aspect_max=16) -> list[tuple[int, int, int, int]]:
    """Find bright-text-on-dark-OR-red-bg regions = label boxes positions."""
    # Pass 1 : bright text inside locally-DARK areas (black label boxes)
    local_mean = cv2.blur(gray, (21, 21))
    black_bg_text = (gray > 140) & (local_mean < 80)

    # Pass 2 : bright text inside locally-RED areas (warp rift label boxes)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    red_lo = cv2.inRange(hsv, np.array([0, 100, 60]), np.array([10, 255, 255]))
    red_hi = cv2.inRange(hsv, np.array([170, 100, 60]), np.array([180, 255, 255]))
    red_mask = cv2.bitwise_or(red_lo, red_hi)
    local_red = cv2.blur(red_mask, (21, 21))
    red_bg_text = (gray > 160) & (local_red > 80)

    text_mask = (black_bg_text | red_bg_text).astype(np.uint8) * 255

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5))
    text_mask = cv2.morphologyEx(text_mask, cv2.MORPH_CLOSE, kernel)
    text_mask = cv2.dilate(text_mask, np.ones((3, 8), np.uint8))
    contours, _ = cv2.findContours(text_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = []
    for c in contours:
        if cv2.contourArea(c) < min_area:
            continue
        x, y, w, h = cv2.boundingRect(c)
        aspect = w / max(h, 1)
        if (w < min_w or h < min_h or w > max_w or h > max_h
                or aspect < aspect_min or aspect > aspect_max):
            continue
        out.append((x, y, w, h))
    return out


def fuse_multiline_labels(boxes: list[tuple[int, int, int, int]],
                            vertical_gap_max: int = 6,
                            x_overlap_ratio_min: float = 0.65,
                            height_ratio_max: float = 1.4) -> list[tuple[int, int, int, int]]:
    """Fuse vertically-adjacent x-aligned text boxes that are SAME-FONT-SIZE multi-line labels.
    Strict constraints to avoid fusing distinct adjacent labels :
    - vertical gap ≤ 6 px (between text lines of same label)
    - 65 %+ horizontal overlap (words of same label share x range)
    - similar heights (≤40 % difference, ensures same font size)"""
    sorted_boxes = sorted(boxes, key=lambda b: (b[1], b[0]))
    fused: list[tuple[int, int, int, int]] = []
    used = [False] * len(sorted_boxes)
    for i, b1 in enumerate(sorted_boxes):
        if used[i]:
            continue
        x1, y1, w1, h1 = b1
        h0 = h1  # font size reference
        changed = True
        while changed:
            changed = False
            for j in range(i + 1, len(sorted_boxes)):
                if used[j]:
                    continue
                x2, y2, w2, h2 = sorted_boxes[j]
                v_gap = y2 - (y1 + h1)
                if not (-2 <= v_gap <= vertical_gap_max):
                    continue
                ox = max(x1, x2)
                oy = min(x1 + w1, x2 + w2)
                overlap = max(0, oy - ox)
                if overlap / min(w1, w2) < x_overlap_ratio_min:
                    continue
                # Same-font-size check
                if max(h2, h0) / min(h2, h0) > height_ratio_max:
                    continue
                used[j] = True
                nx = min(x1, x2)
                ny = min(y1, y2)
                ne_x = max(x1 + w1, x2 + w2)
                ne_y = max(y1 + h1, y2 + h2)
                x1, y1, w1, h1 = nx, ny, ne_x - nx, ne_y - ny
                changed = True
        used[i] = True
        fused.append((x1, y1, w1, h1))
    return fused


def find_battle_markers(bgr: np.ndarray) -> list[tuple[int, int, int]]:
    """Find red X battle markers (saturated red circles, ~40-60 px diameter).
    Returns list of (cx, cy, radius)."""
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    red_lo = cv2.inRange(hsv, np.array([0, 150, 100]), np.array([10, 255, 255]))
    red_hi = cv2.inRange(hsv, np.array([170, 150, 100]), np.array([180, 255, 255]))
    red_mask = cv2.bitwise_or(red_lo, red_hi)
    # Close inner X (white swords) so circle is solid
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    red_mask = cv2.morphologyEx(red_mask, cv2.MORPH_CLOSE, kernel)
    contours, _ = cv2.findContours(red_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    markers: list[tuple[int, int, int]] = []
    for c in contours:
        area = cv2.contourArea(c)
        if not (700 < area < 5000):  # ~30-50 px diameter
            continue
        peri = cv2.arcLength(c, True)
        if peri == 0:
            continue
        circularity = 4 * np.pi * area / (peri ** 2)
        if circularity < 0.55:
            continue
        (cx, cy), r = cv2.minEnclosingCircle(c)
        markers.append((int(cx), int(cy), int(r)))
    return markers


def find_nearest_battle_marker(label_box: tuple[int, int, int, int],
                                  markers: list[tuple[int, int, int]],
                                  max_dist: int = 90) -> tuple[int, int] | None:
    """If a battle marker exists within max_dist of the label center, return its center.
    Picks the closest one. Returns None if no marker is close enough."""
    lx, ly, lw, lh = label_box
    cxl = lx + lw // 2
    cyl = ly + lh // 2
    best = None
    best_d = max_dist
    for mx, my, _ in markers:
        d = np.hypot(mx - cxl, my - cyl)
        if d < best_d:
            best_d = d
            best = (mx, my)
    return best


def find_triangle_tip(gray: np.ndarray, bgr: np.ndarray,
                       text_box: tuple[int, int, int, int],
                       expand: int = 25) -> tuple[int, int]:
    """Compare contour bbox vs text bbox → triangle direction = side that protrudes.
    Tip = contour extreme in that direction. Falls back to text box center."""
    img_h, img_w = gray.shape[:2]
    tx, ty, tw, th = text_box
    px = max(0, tx - expand)
    py = max(0, ty - expand)
    pw = min(img_w, tx + tw + expand) - px
    ph = min(img_h, ty + th + expand) - py
    roi_gray = gray[py:py + ph, px:px + pw]
    roi_bgr = bgr[py:py + ph, px:px + pw]

    _, dark_mask = cv2.threshold(roi_gray, 35, 255, cv2.THRESH_BINARY_INV)
    hsv = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2HSV)
    red_lo = cv2.inRange(hsv, np.array([0, 100, 60]), np.array([10, 255, 255]))
    red_hi = cv2.inRange(hsv, np.array([170, 100, 60]), np.array([180, 255, 255]))
    red_mask = cv2.bitwise_or(red_lo, red_hi)
    mask = cv2.bitwise_or(dark_mask, red_mask)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return tx + tw // 2, ty + th // 2
    big = max(contours, key=cv2.contourArea)
    bx, by, bw, bh = cv2.boundingRect(big)
    rtx, rty = tx - px, ty - py
    margins = {
        'top':    rty - by,
        'bottom': (by + bh) - (rty + th),
        'left':   rtx - bx,
        'right':  (bx + bw) - (rtx + tw),
    }
    direction = max(margins, key=lambda k: margins[k])
    if margins[direction] < 5:
        return tx + tw // 2, ty + th // 2
    pts = big.reshape(-1, 2)
    if direction == 'top':
        idx = int(np.argmin(pts[:, 1]))
    elif direction == 'bottom':
        idx = int(np.argmax(pts[:, 1]))
    elif direction == 'left':
        idx = int(np.argmin(pts[:, 0]))
    else:
        idx = int(np.argmax(pts[:, 0]))
    return px + int(pts[idx, 0]), py + int(pts[idx, 1])


# --------------------------------------------------------------------- OCR

def ocr_text(gray: np.ndarray, text_box: tuple[int, int, int, int]) -> str:
    if not HAS_OCR:
        return ""
    x, y, w, h = text_box
    pad = 4
    H, W = gray.shape[:2]
    x0, y0 = max(0, x - pad), max(0, y - pad)
    x1, y1 = min(W, x + w + pad), min(H, y + h + pad)
    roi = gray[y0:y1, x0:x1]
    up = cv2.resize(roi, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    _, binar = cv2.threshold(up, 100, 255, cv2.THRESH_BINARY_INV)
    try:
        # PSM 6 = uniform block of text (better for multi-line labels)
        raw = pytesseract.image_to_string(binar, config='--psm 6').strip()
    except Exception as e:
        sys.stderr.write(f"OCR error: {e}\n")
        return ""
    cleaned = ''.join(c if c.isalnum() or c in " '-" else ' ' for c in raw)
    return ' '.join(cleaned.split()).upper()


# ----------------------------------------------------------------- Pipeline

def detect(img_path: str, debug: bool = False) -> dict:
    img = cv2.imread(img_path)
    if img is None:
        sys.exit(f"ERROR: cannot read {img_path}")
    H, W = img.shape[:2]
    sys.stderr.write(f"Image: {W}x{H}\n")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    text_boxes_raw = find_text_regions(gray, img)
    sys.stderr.write(f"Raw text candidates: {len(text_boxes_raw)}\n")
    text_boxes = fuse_multiline_labels(text_boxes_raw)
    sys.stderr.write(f"After multi-line fusion: {len(text_boxes)}\n")

    battle_markers = find_battle_markers(img)
    sys.stderr.write(f"Battle markers detected: {len(battle_markers)}\n")

    debug_img = img.copy() if debug else None
    out: dict = {}
    n_idx = 0
    n_battle_used = 0

    for tb in text_boxes:
        text = ocr_text(gray, tb)
        # Priority : battle marker (canon position for ✝ planets) > triangle tip
        battle = find_nearest_battle_marker(tb, battle_markers)
        used_battle = battle is not None
        if used_battle:
            tip_x, tip_y = battle
            n_battle_used += 1
        else:
            tip_x, tip_y = find_triangle_tip(gray, img, tb)

        if not text or len(text) < 2:
            text = f"LABEL_{n_idx}"
            n_idx += 1
        if text in out:
            text = f"{text}_{n_idx}"
            n_idx += 1
        out[text] = [tip_x, tip_y]

        if debug and debug_img is not None:
            x, y, w, h = tb
            cv2.rectangle(debug_img, (x, y), (x + w, y + h), (0, 255, 0), 1)
            color = (255, 0, 255) if used_battle else (0, 0, 255)
            cv2.circle(debug_img, (tip_x, tip_y), 6, color, -1)
            cv2.line(debug_img, (x + w // 2, y + h // 2), (tip_x, tip_y), (0, 200, 255), 1)
            cv2.putText(debug_img, text[:18], (x, max(10, y - 3)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)

    if debug and debug_img is not None:
        # Also draw all detected battle markers (magenta circles)
        for mx, my, mr in battle_markers:
            cv2.circle(debug_img, (mx, my), mr, (255, 0, 255), 2)
        cv2.imwrite("debug-detected.jpg", debug_img)
        sys.stderr.write("Debug: debug-detected.jpg\n")

    sys.stderr.write(f"Detected: {len(out)} labels ({n_battle_used} via battle marker)\n")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('image')
    parser.add_argument('--debug', action='store_true')
    args = parser.parse_args()
    print(json.dumps(detect(args.image, args.debug), indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
