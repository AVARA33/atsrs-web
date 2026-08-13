from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
BRAND_DIR = ROOT / "assets" / "branding"


def remove_dark_matte(source: Path, destination: Path, light_mode=False) -> None:
    image = Image.open(source).convert("RGB")
    rgb = np.asarray(image, dtype=np.float32)
    edge = np.median(rgb[:, -18:, :], axis=1)
    kernel = np.ones(31, dtype=np.float32) / 31.0
    padded = np.pad(edge, ((15, 15), (0, 0)), mode="edge")
    smooth_edge = np.column_stack(
        [np.convolve(padded[:, channel], kernel, mode="valid") for channel in range(3)]
    )
    matte = smooth_edge[:, None, :]
    delta = np.clip(rgb - matte, 0.0, 255.0)
    strength = delta.max(axis=2)

    # The supplied logo is rendered over a near-black/navy matte. Estimate
    # that matte row-by-row, build a feathered alpha channel from the visible
    # logo energy, then un-premultiply the edges for a clean transparent asset.
    t = np.clip((strength - 5.0) / 65.0, 0.0, 1.0)
    alpha = t * t * (3.0 - 2.0 * t)
    alpha[alpha < 0.025] = 0.0

    safe_alpha = np.maximum(alpha[..., None], 0.12)
    foreground = np.clip(delta / safe_alpha, 0.0, 255.0)
    foreground[alpha == 0.0] = 0.0
    if light_mode:
        peak = rgb.max(axis=2)
        spread = rgb.max(axis=2) - rgb.min(axis=2)
        neutral = (spread < 52.0) & (peak > 78.0) & (alpha > 0.08)
        yy, xx = np.indices(peak.shape)

        # Keep the source highlights inside the illustrated mark. Only the
        # neutral ATS lettering, divider, subtitle and TM become graphite on
        # the light canvas; RS keeps its supplied blue gradient.
        text_region = (
            ((xx >= 410) & (xx <= 815) & (yy >= 62) & (yy <= 248))
            | ((xx >= 400) & (xx <= 435) & (yy >= 72) & (yy <= 325))
            | ((xx >= 430) & (yy >= 245) & (yy <= 350))
            | ((xx >= 1040) & (yy >= 62) & (yy <= 130))
        )
        graphite = np.asarray((8, 13, 21), dtype=np.float32)
        foreground[neutral & text_region] = graphite

        # Preserve the supplied blue/cyan artwork and restore its glossy
        # highlights after matte removal without tinting the black lettering.
        coloured = (spread >= 52.0) & (alpha > 0.08)
        enhanced = np.clip(foreground * 1.13, 0.0, 255.0)
        highlight = (np.clip((peak - 150.0) / 105.0, 0.0, 1.0) * 0.16)[..., None]
        cyan_light = np.asarray((105, 235, 255), dtype=np.float32)
        enhanced = enhanced * (1.0 - highlight) + cyan_light * highlight
        foreground[coloured] = enhanced[coloured]

    rgba = np.dstack((foreground.astype(np.uint8), (alpha * 255.0).astype(np.uint8)))
    result = Image.fromarray(rgba, "RGBA")
    if light_mode:
        coloured_alpha = np.where(coloured, alpha, 0.0)
        glow_mask = Image.fromarray((coloured_alpha * 255.0).astype(np.uint8), "L")
        wide = glow_mask.filter(ImageFilter.GaussianBlur(10)).point(lambda value: value * 0.2)
        close = glow_mask.filter(ImageFilter.GaussianBlur(4)).point(lambda value: value * 0.25)
        wide_glow = Image.new("RGBA", result.size, (20, 111, 238, 0))
        wide_glow.putalpha(wide)
        close_glow = Image.new("RGBA", result.size, (51, 205, 255, 0))
        close_glow.putalpha(close)
        result = Image.alpha_composite(Image.alpha_composite(wide_glow, close_glow), result)
    result.save(destination, optimize=True)


for colour in ("green", "blue"):
    remove_dark_matte(
        BRAND_DIR / f"atsrs-login-{colour}.png",
        BRAND_DIR / f"atsrs-lockup-{colour}-transparent.png",
        light_mode=colour == "blue",
    )
