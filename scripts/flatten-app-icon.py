#!/usr/bin/env python3
"""Turn a finished, pre-rounded icon PNG into assets iOS will actually accept.

Design tools hand back an app icon already drawn as a rounded square, usually
sitting on a black or transparent field. iOS wants the opposite: a full-bleed
opaque square with no alpha and no rounding of its own — it applies the mask
itself. Ship the rounded art as-is and App Store Connect rejects the binary
("Invalid large app icon ... can't be transparent nor contain an alpha
channel"), and even when it slips through you get the corners masked twice.

    python3 scripts/flatten-app-icon.py <source.png> \
        --icon-out apps/admin-app/assets/icon.png \
        --splash-out apps/admin-app/assets/splash-icon.png

Two outputs from the one source:

  * the icon — square, opaque, corners filled by extending the art's own edge
    pixels outward, so a background gradient carries into the corner instead of
    meeting a flat patch;
  * the splash — the rounded card kept as-is, with the black field turned
    transparent so it sits on whatever `backgroundColor` the splash uses.

The frame is found by brightness, not by assuming a corner radius: anything
darker than --threshold around the edge of a row is the field, not the art.
The default sits well above the grey outline these exports carry (~60) and well
below the artwork's lightest background (~250), because at the flat top and
bottom of the card an entire row *is* that outline — count it as art and it
gets replicated over the whole top and bottom of the icon as a grey band.
--inset then steps a few pixels further in on all four sides, for the part of
the stroke that antialiasing lifts above the threshold.
"""

import argparse

from PIL import Image

CANVAS = 1024


def row_extents(px, w, h, threshold, inset):
    """Per row, the first and last x that are art rather than field.

    Scans inward from both edges, so a dark logo in the middle of a row is
    never mistaken for the field — only what the edge runs into counts.
    """
    spans = []
    for y in range(h):
        x0 = None
        for x in range(w):
            r, g, b = px[x, y]
            if max(r, g, b) >= threshold:
                x0 = x
                break
        if x0 is None:
            spans.append(None)
            continue
        x1 = w - 1
        for x in range(w - 1, -1, -1):
            r, g, b = px[x, y]
            if max(r, g, b) >= threshold:
                x1 = x
                break
        # Step past the outline stroke on both sides.
        x0, x1 = x0 + inset, x1 - inset
        spans.append((x0, x1) if x1 > x0 else None)

    # The same inset, vertically. The first and last rows holding any art are
    # the card's own top and bottom edge; stepping in past them keeps the
    # stroke out of the rows that later get replicated upward and downward.
    present = [y for y, span in enumerate(spans) if span is not None]
    if present:
        top, bottom = present[0] + inset, present[-1] - inset
        for y in range(h):
            if y < top or y > bottom:
                spans[y] = None
    return spans


def build_icon(im, spans):
    """Opaque square: every field pixel replaced by the nearest art pixel."""
    w, h = im.size
    out = im.copy()
    src, dst = im.load(), out.load()

    for y, span in enumerate(spans):
        if span is None:
            continue
        x0, x1 = span
        left, right = src[x0, y], src[x1, y]
        for x in range(0, x0):
            dst[x, y] = left
        for x in range(x1 + 1, w):
            dst[x, y] = right

    # Rows above and below the art (the flat top and bottom of the rounded
    # card) have nothing to clamp to sideways, so they take the nearest row
    # that does. Done after the horizontal pass, so what they copy is already
    # a full-width row.
    filled = [y for y, s in enumerate(spans) if s is not None]
    if not filled:
        raise SystemExit('no art found — try a lower --threshold')
    first, last = filled[0], filled[-1]
    for y in range(0, first):
        for x in range(w):
            dst[x, y] = dst[x, first]
    for y in range(last + 1, h):
        for x in range(w):
            dst[x, y] = dst[x, last]

    return out.convert('RGB')


def build_splash(im, spans):
    """The rounded card, field turned transparent, outline trimmed off."""
    w, h = im.size
    out = im.convert('RGBA')
    px = out.load()
    for y, span in enumerate(spans):
        if span is None:
            for x in range(w):
                px[x, y] = (0, 0, 0, 0)
            continue
        x0, x1 = span
        for x in range(0, x0):
            px[x, y] = (0, 0, 0, 0)
        for x in range(x1 + 1, w):
            px[x, y] = (0, 0, 0, 0)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source', help='the finished icon PNG from the designer')
    ap.add_argument('--icon-out', required=True)
    ap.add_argument('--splash-out')
    ap.add_argument('--threshold', type=int, default=90,
                    help='max channel value still counted as field (default 90)')
    ap.add_argument('--inset', type=int, default=10,
                    help='pixels to step past the outline stroke (default 10)')
    args = ap.parse_args()

    im = Image.open(args.source).convert('RGB')
    w, h = im.size
    spans = row_extents(im.load(), w, h, args.threshold, args.inset)

    icon = build_icon(im, spans).resize((CANVAS, CANVAS), Image.LANCZOS)
    icon.save(args.icon_out)
    print(f'{args.icon_out} {icon.size[0]}x{icon.size[1]} {icon.mode}')

    if args.splash_out:
        splash = build_splash(im, spans).resize((CANVAS, CANVAS), Image.LANCZOS)
        splash.save(args.splash_out)
        print(f'{args.splash_out} {splash.size[0]}x{splash.size[1]} {splash.mode}')


if __name__ == '__main__':
    main()
