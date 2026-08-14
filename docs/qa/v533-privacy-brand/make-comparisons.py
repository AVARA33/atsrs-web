from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).parent

def fit_width(image, width):
    height = round(image.height * width / image.width)
    return image.resize((width, height), Image.Resampling.LANCZOS)

def stack(label_a, image_a, label_b, image_b, output):
    width = max(image_a.width, image_b.width)
    label_height = 42
    canvas = Image.new("RGB", (width, image_a.height + image_b.height + label_height * 2 + 20), "#0b0d0d")
    draw = ImageDraw.Draw(canvas)
    draw.text((14, 12), label_a, fill="white")
    canvas.paste(image_a, ((width - image_a.width) // 2, label_height))
    second_y = label_height + image_a.height + 20
    draw.text((14, second_y + 12), label_b, fill="white")
    canvas.paste(image_b, ((width - image_b.width) // 2, second_y + label_height))
    canvas.save(ROOT / output, optimize=True)

source_dark = Image.open(ROOT / "source-dark-sharing.png").convert("RGB").crop((395, 350, 1745, 817))
impl_dark = Image.open(ROOT / "implementation-dark-sharing.png").convert("RGB").crop((250, 180, 1270, 690))
stack("SOURCE: blue sharing cards to darken", fit_width(source_dark, 1000), "V533: dark sharing surfaces", fit_width(impl_dark, 1000), "comparison-dark-sharing.png")

source_logo = Image.open(ROOT / "source-light-logo.png").convert("RGB").crop((70, 230, 1465, 715))
impl_logo = Image.open(ROOT / "implementation-light-login.png").convert("RGB").crop((400, 205, 875, 390))
stack("SOURCE: approved Light logo", fit_width(source_logo, 1000), "V533: Light Login logo, no black shadow", fit_width(impl_logo, 1000), "comparison-light-logo.png")
