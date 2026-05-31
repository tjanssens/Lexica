"""
Genereert het monochrome notificatie-badge-icoon voor Android (statusbalk).

Android maskeert de badge tot zijn alpha-vorm en tekent die in de systeemkleur.
Vorm: een gevuld (wit) afgerond vierkant met de Lexica-'Λ' eruit GESNEDEN
(transparant). Zo verschijnt in de statusbalk een vierkantje met een
transparante Λ-vorm i.p.v. een leeg wit blok.

De Λ komt overeen met icon.svg: pad M 130 410 L 256 140 L 382 410 in een
512x512 viewbox, stroke-width 58, ronde caps/joins.

Output: src/assets/icons/badge-96.png (96x96, gegenereerd via 8x supersampling).
"""
from PIL import Image, ImageDraw, ImageChops

VIEWBOX = 512
SS = 8                      # supersampling-factor voor gladde randen
SIZE = VIEWBOX * SS
OUT_SIZE = 96

# Afgerond vierkant met kleine marge zodat de hoeken niet tegen de rand plakken.
margin = 24 * SS
radius = 88 * SS

# Λ-padpunten en streekbreedte uit icon.svg, geschaald met SS.
p1 = (130 * SS, 410 * SS)
p2 = (256 * SS, 140 * SS)
p3 = (382 * SS, 410 * SS)
stroke = 58 * SS
r = stroke // 2            # straal voor ronde caps/joins

# 1. Wit afgerond vierkant op transparant.
base = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
ImageDraw.Draw(base).rounded_rectangle(
    [margin, margin, SIZE - margin, SIZE - margin],
    radius=radius, fill=(255, 255, 255, 255),
)

# 2. Masker met de Λ-vorm.
mask = Image.new("L", (SIZE, SIZE), 0)
md = ImageDraw.Draw(mask)
md.line([p1, p2], fill=255, width=stroke)
md.line([p2, p3], fill=255, width=stroke)
for (cx, cy) in (p1, p2, p3):
    md.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)

# 3. Pons de Λ uit het vierkant: waar het masker wit is, wordt alpha 0.
alpha = ImageChops.subtract(base.split()[3], mask)
base.putalpha(alpha)

base = base.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
out = "src/lexica-frontend/src/assets/icons/badge-96.png"
base.save(out)
print(f"Geschreven: {out} ({OUT_SIZE}x{OUT_SIZE})")
