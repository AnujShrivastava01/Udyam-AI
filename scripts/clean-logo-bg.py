# -*- coding: utf-8 -*-
"""
Make a logo's flat background transparent.

    python scripts/clean-logo-bg.py public/logos/raw/*.png

Writes a cleaned PNG next to the source, into public/logos/.

Why not just "remove white": these marks sit on near-white JPEG backgrounds with compression
noise, so an exact-match test leaves a grey halo. This does a flood fill from the four corners
with a tolerance, which removes the surrounding field without punching holes in white areas
INSIDE the mark — the NSFDC roundel and the MoSPI emblem both have white interiors that a global
colour test would eat.

Alpha is feathered by one pixel at the boundary so the edge does not look cut out with scissors
against a cream page.
"""

import sys
import os
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip install Pillow")

TOLERANCE = 32  # per-channel distance from the corner colour that still counts as background
OUT_DIR = os.path.join("public", "logos")


def close_enough(a, b, tol=TOLERANCE):
    return abs(a[0] - b[0]) <= tol and abs(a[1] - b[1]) <= tol and abs(a[2] - b[2]) <= tol


def clean(path):
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    # The background colour is whatever occupies the corners. Sampling all four and taking the
    # most common guards against one corner containing part of the mark.
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = max(set(map(lambda c: c[:3], corners)), key=lambda c: sum(close_enough(c, o[:3]) for o in corners))

    seen = [[False] * h for _ in range(w)]
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            queue.append((x, y))

    transparent = 0
    while queue:
        x, y = queue.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[x][y]:
            continue
        seen[x][y] = True
        r, g, b, a = px[x, y]
        if not close_enough((r, g, b), bg):
            continue
        px[x, y] = (r, g, b, 0)
        transparent += 1
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # Feather: any opaque pixel touching a transparent one is softened, so the edge reads as
    # anti-aliased rather than clipped.
    edges = []
    for x in range(w):
        for y in range(h):
            if px[x, y][3] == 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                    edges.append((x, y))
                    break
    for x, y in edges:
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, int(a * 0.55))

    os.makedirs(OUT_DIR, exist_ok=True)
    name = os.path.splitext(os.path.basename(path))[0] + ".png"
    out = os.path.join(OUT_DIR, name)
    # Trim to the mark itself so every logo sits on its own bounds and can be sized by height.
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    img.save(out)
    pct = 100 * transparent / (w * h)
    print(f"{os.path.basename(path):32}  bg {bg}  {pct:5.1f}% cleared  ->  {out}  {img.size}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    for p in sys.argv[1:]:
        clean(p)
