#!/usr/bin/env python3
"""Derive every mobile icon from the one brand asset.

Source of truth is the website's PWA icon (`apps/website/public/icon-512.png`) —
the green "C" already shipped to the web. Before this script the app shipped
Expo's placeholder (a blue X on a design grid) as launcher, splash and
notification icon on both platforms.

    python3 scripts/make-icons.py --out apps/mobile-app/assets
    python3 scripts/make-icons.py --out apps/admin-app/assets \
        --plate 7,15,12 --mark 47,190,143

The admin app is the same mark on the dark ground its UI uses, so the two
Caresy apps are recognisably siblings without being confusable in the app
switcher. Both are regenerated from the same file, so a brand change is one
edit and two commands.

Everything is regenerated from that single file, so re-running after a brand
change is the whole update. Outputs land in `assets/`.

Two Android rules drive the odd sizes here:
  * Adaptive icons are masked to an arbitrary shape, so art must sit inside the
    centre 66% "safe zone" — anything outside can be cropped by the launcher.
  * Notification icons are drawn as a silhouette: Android keeps the alpha and
    throws the colour away. A full-colour square renders as a white blob.
"""

import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "apps/website/public/icon-512.png"

BRAND_DEFAULT = (2, 140, 99)  # the logo green, sampled from the source
CANVAS = 1024                 # store/launcher master size
SAFE_FRACTION = 0.62          # of CANVAS — inside Android's 66% adaptive safe zone


def logo_mask(path):
    """Alpha-only cut-out of the logo, trimmed to its bounding box.

    The source is opaque green on opaque white, so a pixel's red channel is a
    direct read of how much white is mixed in: red 255 is background, red ~2 is
    solid logo. Inverting it recovers the antialiased edges that a flat
    colour-distance threshold would otherwise turn into jaggies.
    """
    im = Image.open(path).convert("RGB")
    alpha = im.split()[0].point(lambda r: 255 - r)
    return alpha.crop(alpha.getbbox())


def placed(mask, canvas=CANVAS, fraction=SAFE_FRACTION):
    """Scale the mask to `fraction` of the canvas and centre it."""
    w, h = mask.size
    scale = (canvas * fraction) / max(w, h)
    resized = mask.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new("L", (canvas, canvas), 0)
    out.paste(resized, ((canvas - resized.width) // 2, (canvas - resized.height) // 2))
    return out


def tinted(mask, rgb):
    img = Image.new("RGBA", mask.size, (*rgb, 0))
    img.putalpha(mask)
    return img


def rgb(text):
    parts = tuple(int(p) for p in text.split(","))
    if len(parts) != 3 or any(not 0 <= p <= 255 for p in parts):
        raise argparse.ArgumentTypeError("expected R,G,B with each channel 0-255")
    return parts


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", required=True, help="assets directory to write into")
    ap.add_argument("--plate", type=rgb, default=(255, 255, 255),
                    help="opaque background behind the mark, R,G,B (default white)")
    ap.add_argument("--mark", type=rgb, default=BRAND_DEFAULT,
                    help="colour of the mark itself, R,G,B (default the logo green)")
    args = ap.parse_args()

    OUT = args.out
    BRAND = args.mark
    PLATE = args.plate
    Path(OUT).mkdir(parents=True, exist_ok=True)

    mask = logo_mask(SRC)
    print(f"logo mask {mask.size[0]}x{mask.size[1]} from {SRC}")

    # Square launcher/store icon: the published web icon, upscaled, kept opaque.
    # iOS rejects alpha in App Icons, and Play wants a filled 512 square.
    square_mask = placed(mask, fraction=0.68)
    square = Image.new("RGB", (CANVAS, CANVAS), PLATE)
    square.paste(tinted(square_mask, BRAND), (0, 0), square_mask)
    square.save(f"{OUT}/icon.png")

    # Android adaptive icon: foreground art in the safe zone over a flat plate.
    tinted(placed(mask), BRAND).save(f"{OUT}/android-icon-foreground.png")
    Image.new("RGB", (CANVAS, CANVAS), PLATE).save(f"{OUT}/android-icon-background.png")

    # Themed (monochrome) icon — Android 13+ recolours it, so ship black on clear.
    tinted(placed(mask), (0, 0, 0)).save(f"{OUT}/android-icon-monochrome.png")

    # Notification icon: silhouette only. White so it stays visible while the
    # system tints it against both light and dark status bars.
    tinted(placed(mask, canvas=96, fraction=0.85), (255, 255, 255)).save(f"{OUT}/notification-icon.png")

    # Splash art keeps its own alpha so it sits on the splash background colour.
    tinted(placed(mask), BRAND).save(f"{OUT}/splash-icon.png")

    for name in ("icon", "android-icon-foreground", "android-icon-background",
                 "android-icon-monochrome", "notification-icon", "splash-icon"):
        im = Image.open(f"{OUT}/{name}.png")
        print(f"  {name}.png {im.size[0]}x{im.size[1]} {im.mode}")


if __name__ == "__main__":
    main()
