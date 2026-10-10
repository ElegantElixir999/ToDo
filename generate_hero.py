import math
from PIL import Image, ImageDraw, ImageFilter

def generate_clean_hero(filepath="hero.jpg", width=1920, height=800):
    img = Image.new("RGBA", (width, height), (17, 24, 39, 255)) # Dark slate grey
    draw = ImageDraw.Draw(img)

    # 1. Gradient background from dark charcoal/slate to deep emerald glow
    for y in range(height):
        factor = y / height
        # Transition between dark slate #111827 and charcoal #1f2937
        r = int(17 + (31 - 17) * factor)
        g = int(24 + (41 - 24) * factor)
        b = int(39 + (55 - 39) * factor)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # 2. Glowing emerald/mint ambient light auroras
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    # Right prominent green aura
    glow_draw.ellipse([width * 0.55, -150, width * 1.15, height * 1.1], fill=(16, 185, 129, 95))
    glow_draw.ellipse([width * 0.70, height * 0.1, width * 1.05, height * 0.9], fill=(52, 211, 153, 60))
    # Bottom subtle emerald glow
    glow_draw.ellipse([width * 0.15, height * 0.5, width * 0.65, height * 1.3], fill=(5, 150, 105, 45))
    
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(110))
    img = Image.alpha_composite(img, glow_layer)

    # 3. Geometric diamond grid mesh in graphite grey & silver
    mesh = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    m_draw = ImageDraw.Draw(mesh)
    step = 85
    for x in range(-width, width * 2, step):
        m_draw.line([(x, 0), (x + height, height)], fill=(100, 116, 139, 28), width=1)
        m_draw.line([(x, 0), (x - height, height)], fill=(100, 116, 139, 28), width=1)
    
    img = Image.alpha_composite(img, mesh)

    # 4. Stylized 3D Faceted Diamond Crystals
    crystal_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    c_draw = ImageDraw.Draw(crystal_layer)

    def draw_faceted_diamond(cx, cy, size, rot=0, alpha=235):
        w = size
        h = size * 1.18
        
        # Base relative coordinates
        pts = {
            'top': (0, -h/2),
            'bot': (0, h/2),
            'l': (-w/2, -h*0.06),
            'r': (w/2, -h*0.06),
            'c': (0, -h*0.06),
            'tl': (-w*0.28, -h*0.3),
            'tr': (w*0.28, -h*0.3),
            'tc': (0, -h*0.36),
            'bl': (-w*0.22, h*0.22),
            'br': (w*0.22, h*0.22)
        }
        
        # Rotate & translate points
        cos_a = math.cos(math.radians(rot))
        sin_a = math.sin(math.radians(rot))
        transformed = {}
        for k, (px, py) in pts.items():
            rx = px * cos_a - py * sin_a + cx
            ry = px * sin_a + py * cos_a + cy
            transformed[k] = (rx, ry)
            
        t = transformed

        # Distinct faceted shades: Emerald, Mint, Grey/Silver & Deep Forest
        facets = [
            # Top facets
            ([t['top'], t['tl'], t['tc']], (167, 243, 208, int(alpha * 0.98))), # Mint bright highlight
            ([t['top'], t['tc'], t['tr']], (209, 250, 229, int(alpha * 0.95))), # Sparkling Ice-mint
            ([t['tc'], t['tl'], t['c']], (52, 211, 153, int(alpha * 0.92))),   # Vivid Emerald
            ([t['tc'], t['tr'], t['c']], (110, 231, 183, int(alpha * 0.9))),   # Light Emerald
            ([t['tl'], t['l'], t['c']], (16, 185, 129, int(alpha * 0.88))),   # Pure Emerald
            ([t['tr'], t['r'], t['c']], (5, 150, 105, int(alpha * 0.82))),    # Medium-deep Emerald
            
            # Bottom facets
            ([t['l'], t['bl'], t['c']], (15, 118, 110, int(alpha * 0.9))),    # Deep Teal Emerald
            ([t['r'], t['br'], t['c']], (4, 120, 87, int(alpha * 0.88))),     # Deep Forest
            ([t['bl'], t['bot'], t['c']], (6, 95, 70, int(alpha * 0.95))),    # Shadow Emerald
            ([t['br'], t['bot'], t['c']], (6, 78, 59, int(alpha * 0.95)))     # Dark graphite emerald
        ]

        # Draw facets
        for poly, col in facets:
            c_draw.polygon(poly, fill=col)
            c_draw.line(poly + [poly[0]], fill=(255, 255, 255, int(alpha * 0.45)), width=2)

    # Main centerpiece diamond
    draw_faceted_diamond(int(width * 0.78), int(height * 0.48), 340, rot=-6, alpha=245)
    # Surrounding diamond accents
    draw_faceted_diamond(int(width * 0.56), int(height * 0.28), 160, rot=12, alpha=200)
    draw_faceted_diamond(int(width * 0.93), int(height * 0.68), 170, rot=-15, alpha=190)
    draw_faceted_diamond(int(width * 0.48), int(height * 0.72), 110, rot=8, alpha=150)
    draw_faceted_diamond(int(width * 0.68), int(height * 0.82), 125, rot=-10, alpha=170)
    draw_faceted_diamond(int(width * 0.90), int(height * 0.22), 100, rot=18, alpha=160)
    draw_faceted_diamond(int(width * 0.38), int(height * 0.42), 80, rot=-5, alpha=110)

    # Add glittering starlight sparkles
    sparkles = [
        (width * 0.78, height * 0.12, 10),
        (width * 0.64, height * 0.42, 6),
        (width * 0.89, height * 0.35, 8),
        (width * 0.52, height * 0.18, 5),
        (width * 0.85, height * 0.68, 7),
        (width * 0.44, height * 0.62, 4),
        (width * 0.96, height * 0.48, 6),
        (width * 0.60, height * 0.78, 5),
    ]

    for px, py, s in sparkles:
        c_draw.ellipse([px-s*1.8, py-s*1.8, px+s*1.8, py+s*1.8], fill=(167, 243, 208, 90))
        c_draw.line([(px-s*3.2, py), (px+s*3.2, py)], fill=(255, 255, 255, 240), width=2)
        c_draw.line([(px, py-s*3.2), (px, py+s*3.2)], fill=(255, 255, 255, 240), width=2)
        c_draw.line([(px-s*1.5, py-s*1.5), (px+s*1.5, py+s*1.5)], fill=(209, 250, 229, 180), width=1)
        c_draw.line([(px-s*1.5, py+s*1.5), (px+s*1.5, py-s*1.5)], fill=(209, 250, 229, 180), width=1)

    img = Image.alpha_composite(img, crystal_layer)

    # Convert to RGB and save as high-quality JPG
    final_img = img.convert("RGB")
    final_img.save(filepath, "JPEG", quality=95, optimize=True)
    print(f"Updated high-res clean hero image created at {filepath}")

if __name__ == "__main__":
    generate_clean_hero("hero.jpg")
