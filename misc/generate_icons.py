#!/usr/bin/env python3
"""
Generate high-resolution PNG icons with transparent backgrounds from logo.svg
for Google Workspace Marketplace and Google Cloud OAuth Consent Screen.

Requirements:
- PyMuPDF (pymupdf)
"""

import os
import re
import sys
import pymupdf

SIZES = [
    (128, 128, "icon-128x128.png"),
    (96, 96, "icon-96x96.png"),
    (48, 48, "icon-48x48.png"),
    (32, 32, "icon-32x32.png"),
    (256, 256, "icon-256x256.png"),
    (512, 512, "icon-512x512.png"),
]

def generate_icons(svg_path, output_dir):
    if not os.path.exists(svg_path):
        print(f"Error: SVG not found at {svg_path}")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # Normalizing SVG viewBox and dimensions to ensure 1:1 square rendering without clipping
    # logo.svg viewBox is "140 140 680 680"
    match = re.search(r'(<svg[^>]*>)(.*)(</svg>)', svg_content, re.DOTALL)
    if not match:
        print("Error: Could not parse SVG tags.")
        sys.exit(1)

    _, body, _ = match.groups()
    normalized_svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 680" width="680" height="680">'
        '<g transform="translate(-140, -140)">'
        f'{body}'
        '</g>'
        '</svg>'
    )

    doc = pymupdf.open(stream=normalized_svg.encode("utf-8"), filetype="svg")
    page = doc[0]

    base_w = page.rect.width
    base_h = page.rect.height

    print(f"Loaded source SVG: base dimensions = {base_w}x{base_h}")
    print(f"Target output directory: {output_dir}")
    print("-" * 55)

    generated = []
    for width, height, filename in SIZES:
        scale_x = width / base_w
        scale_y = height / base_h
        matrix = pymupdf.Matrix(scale_x, scale_y)

        # alpha=True guarantees transparent background (RGBA)
        pix = page.get_pixmap(matrix=matrix, alpha=True)
        
        out_path = os.path.join(output_dir, filename)
        png_data = pix.tobytes("png")
        with open(out_path, "wb") as f_out:
            f_out.write(png_data)

        print(f"[OK] {filename:<18} -> {pix.width}x{pix.height} px ({len(png_data):>6} bytes, alpha={bool(pix.alpha)})")
        generated.append(out_path)

    print("-" * 55)
    print(f"Successfully generated {len(generated)} icons with transparent background.")
    return generated

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    svg_file = os.path.join(script_dir, "logo.svg")
    icons_dir = os.path.join(script_dir, "icons")
    generate_icons(svg_file, icons_dir)
