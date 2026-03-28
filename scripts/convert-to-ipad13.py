#!/usr/bin/env python3
"""Convert iPhone poster screenshots to 13-inch iPad App Store size (2064x2752).

Extends the canvas width from 1536 to 2064 by adding 264px on each side,
sampling the background color from the image edges.
"""

import os
import sys
from PIL import Image

INPUT_DIR = "assets/screenshots/posters-raw-v2-20260304-222404"
OUTPUT_DIR = "assets/screenshots/posters-ipad13-v2"
TARGET_W = 2064
TARGET_H = 2752

os.makedirs(OUTPUT_DIR, exist_ok=True)

files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(".png")]
if not files:
    print("No PNG files found in", INPUT_DIR)
    sys.exit(1)

for filename in sorted(files):
    src_path = os.path.join(INPUT_DIR, filename)
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size

    if h != TARGET_H:
        print(f"Warning: {filename} height is {h}, expected {TARGET_H}. Skipping.")
        continue

    pad_total = TARGET_W - w
    pad_left = pad_total // 2
    pad_right = pad_total - pad_left

    # Sample background color from the top-left corner (a few pixels in)
    bg_color = img.getpixel((4, 4))

    # Create new canvas filled with background color
    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), bg_color)

    # Paste original image centered
    canvas.paste(img, (pad_left, 0), img)

    out_path = os.path.join(OUTPUT_DIR, filename)
    canvas.convert("RGB").save(out_path, "PNG", optimize=False)
    print(f"✓ {filename}: {w}x{h} → {TARGET_W}x{TARGET_H}  (pad {pad_left}px left, {pad_right}px right, bg={bg_color[:3]})")

print(f"\nDone. Output: {OUTPUT_DIR}/")
