from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
BRAND_DIR = ROOT / "assets" / "branding"


def remove_dark_matte(source: Path, destination: Path, neutral_palette=None) -> None:
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
    if neutral_palette is not None:
        peak = rgb.max(axis=2)
        spread = rgb.max(axis=2) - rgb.min(axis=2)
        neutral = (spread < 52.0) & (peak > 78.0) & (alpha > 0.08)
        low = np.asarray(neutral_palette[0], dtype=np.float32)
        high = np.asarray(neutral_palette[1], dtype=np.float32)
        shine = np.clip((peak - 78.0) / 177.0, 0.0, 1.0) ** 1.25
        metallic_blue = low + (high - low) * shine[..., None]
        foreground[neutral] = metallic_blue[neutral]

    rgba = np.dstack((foreground.astype(np.uint8), (alpha * 255.0).astype(np.uint8)))
    Image.fromarray(rgba, "RGBA").save(destination, optimize=True)


for colour in ("green", "blue"):
    remove_dark_matte(
        BRAND_DIR / f"atsrs-login-{colour}.png",
        BRAND_DIR / f"atsrs-lockup-{colour}-transparent.png",
        neutral_palette=((4, 29, 80), (58, 153, 232)) if colour == "blue" else None,
    )
