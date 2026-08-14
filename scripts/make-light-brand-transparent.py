from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BRAND_DIR = ROOT / "assets" / "branding"
SOURCE = BRAND_DIR / "atsrs-lockup-light-v533.png"
DESTINATION = BRAND_DIR / "atsrs-lockup-light-transparent.png"


def remove_white_matte(source: Path, destination: Path) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image, dtype=np.float32)

    # Recover the supplied blue/graphite artwork from its white presentation
    # canvas. The feathered alpha keeps the cyan luminosity while removing the
    # visible white card and the grey fringe it would otherwise leave behind.
    distance = 255.0 - rgb.min(axis=2)
    alpha = np.clip((distance - 1.5) / 58.0, 0.0, 1.0)
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)
    alpha[alpha < 0.018] = 0.0

    safe_alpha = np.maximum(alpha[..., None], 0.035)
    foreground = 255.0 + (rgb - 255.0) / safe_alpha
    foreground = np.clip(foreground, 0.0, 255.0)
    foreground[alpha == 0.0] = 0.0

    visible = alpha > 0.018
    rows, columns = np.where(visible)
    if not len(rows):
        raise RuntimeError("No visible logo pixels found")

    padding = 12
    top = max(0, int(rows.min()) - padding)
    bottom = min(image.height, int(rows.max()) + padding + 1)
    left = max(0, int(columns.min()) - padding)
    right = min(image.width, int(columns.max()) + padding + 1)

    rgba = np.dstack(
        (foreground.astype(np.uint8), (alpha * 255.0).astype(np.uint8))
    )
    cropped = Image.fromarray(rgba, "RGBA").crop((left, top, right, bottom))

    canvas_size = (1108, 384)
    inset = (8, 8)
    scale = min(
        (canvas_size[0] - inset[0] * 2) / cropped.width,
        (canvas_size[1] - inset[1] * 2) / cropped.height,
    )
    resized = cropped.resize(
        (round(cropped.width * scale), round(cropped.height * scale)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    offset = (
        (canvas_size[0] - resized.width) // 2,
        (canvas_size[1] - resized.height) // 2,
    )
    canvas.alpha_composite(resized, offset)

    # The supplied presentation source contains a neutral drop shadow below
    # the illustrated mark. Remove only that neutral shadow while retaining
    # the saturated blue floor light and the mark's intentional 3D shading.
    pixels = np.asarray(canvas).copy()
    canvas_rgb = pixels[..., :3].astype(np.int16)
    yy, xx = np.indices((canvas_size[1], canvas_size[0]))
    neutral_shadow = (
        (xx < 470)
        & (yy > 258)
        & ((canvas_rgb.max(axis=2) - canvas_rgb.min(axis=2)) < 34)
        & (canvas_rgb.max(axis=2) < 150)
    )
    pixels[neutral_shadow, 3] = 0
    canvas = Image.fromarray(pixels, "RGBA")
    canvas.save(destination, optimize=True)


remove_white_matte(SOURCE, DESTINATION)
