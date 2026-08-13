from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "qa" / "v515"
SOURCE = Path(r"C:\Users\user\AppData\Local\Temp\codex-clipboard-af9594fd-8a30-498b-a6e6-685e7dc18f8f.png")


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    image = image.copy()
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    return image


source = Image.open(SOURCE).convert("RGB").crop((55, 220, 1485, 700))
implementation = Image.open(OUT / "login-light-desktop.png").convert("RGB").crop((390, 200, 890, 390))
canvas = Image.new("RGB", (1280, 360), (19, 24, 34))
draw = ImageDraw.Draw(canvas)
font = ImageFont.load_default()
draw.text((30, 16), "SOURCE: LUMINOUS BLUE LOCKUP", fill=(235, 240, 248), font=font)
draw.text((660, 16), "V515: TRANSPARENT LIGHT-MODE LOCKUP", fill=(235, 240, 248), font=font)
left = fit(source, 590, 300)
right = fit(implementation, 590, 300)
canvas.paste(left, (30, 48 + (300 - left.height) // 2))
canvas.paste(right, (660, 48 + (300 - right.height) // 2))
canvas.save(OUT / "comparison-login-light-focus.jpg", quality=94)
