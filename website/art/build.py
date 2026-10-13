"""The website's UI art: dark polished chrome in the OpenMU Babylon logo's style, dressed in flowing vines
(stems that taper and weave, rounded leaves, curling tendrils, buds lit in the theme's colour). Rendered
pixel by pixel at screen resolution, once per theme.

python website/art/build.py [out_dir]     (default: website/config/resources/img/ui)
Writes <out>/<theme>/<piece>.png for every theme and <out>/themes.css, which maps each theme to its pieces
and accent colours as CSS variables (the site picks one with <html data-theme>). The site image runs it at
build (install/stack/web.Dockerfile).

Every edge grows its own vine from its own seed, and the pieces stretch instead of tiling, so nothing on a
page repeats. Shapes are masks; their bevel comes from a blurred mask, the chrome from reflecting a
sky-horizon-ground ramp, the light from additive glow. 9-slice cuts are noted on each piece and match site.css.
"""
import math
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SS = 2                                    # everything is drawn at 2x and filtered down
LIGHT = np.array([-0.45, -0.8, 1.0])
LIGHT /= np.linalg.norm(LIGHT)

# Reflection ramps, indexed by how much the surface reflects the sky (1) or the ground (-1): the bright top,
# the black horizon band and the cold lower glint of the logo's letters, kept dark.
CHROME = [(-1, (46, 56, 70)), (-0.35, (14, 17, 23)), (-0.05, (4, 5, 8)), (0.12, (26, 32, 43)),
          (0.45, (92, 106, 126)), (0.8, (166, 180, 199)), (1, (226, 233, 243))]
VINE = [(-1, (34, 40, 50)), (-0.35, (10, 12, 16)), (-0.05, (4, 5, 7)), (0.12, (20, 24, 32)),
        (0.45, (70, 80, 96)), (0.8, (132, 144, 162)), (1, (196, 204, 218))]
DARK = [(-1, (18, 20, 26)), (-0.2, (6, 6, 8)), (0.2, (9, 10, 13)), (1, (28, 32, 40))]

# The accent of each theme; its glow, hot core and coloured chrome are derived from it.
THEMES = {
    "red": (200, 37, 26),
    "orange": (226, 104, 22),
    "yellow": (218, 172, 32),
    "green": (36, 168, 78),
    "blue": (40, 116, 226),
    "purple": (136, 56, 226),
}

GLOW = CORE = None                        # set per theme by use_theme()
ACCENT = []


def use_theme(rgb):
    global GLOW, CORE, ACCENT
    base = np.array(rgb, np.float32) / 255
    GLOW = base / base.max() * 0.92
    CORE = base * 0.45 + 0.55
    mix = lambda f, w: tuple(int(round(255 * min(1, c * f + w))) for c in base)
    ACCENT = [(-1, mix(0.35, 0)), (-0.35, mix(0.15, 0)), (-0.05, mix(0.05, 0)), (0.12, mix(0.35, 0)),
              (0.45, mix(0.75, 0)), (0.8, mix(0.75, 0.3)), (1, mix(0.3, 0.75))]


def hex_of(rgb, white=0.0):
    return "#" + "".join(f"{int(round(c + (255 - c) * white)):02x}" for c in rgb)


# ---------- maths ----------

def grid(w, h):
    ys, xs = np.mgrid[0:h * SS, 0:w * SS].astype(np.float32)
    return (xs + 0.5) / SS, (ys + 0.5) / SS


def rrect(x, y, x0, y0, x1, y1, r):
    """Signed distance to a rounded rectangle, negative inside."""
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    qx = np.abs(x - cx) - ((x1 - x0) / 2 - r)
    qy = np.abs(y - cy) - ((y1 - y0) / 2 - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def blur(a, sigma, wrap=False):
    """Gaussian blur as three box passes (cumulative sums): the same cost whatever the radius."""
    if sigma <= 0:
        return a
    r = max(1, int(round((math.sqrt(4 * (sigma * SS) ** 2 + 1) - 1) / 2)))
    for axis in (0, 1):
        for _ in range(3):
            p = np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in range(2)], mode="wrap" if wrap else "edge")
            c = np.cumsum(p, axis=axis, dtype=np.float64)
            n = a.shape[axis]
            a = ((np.take(c, range(2 * r + 1, 2 * r + 1 + n), axis=axis) - np.take(c, range(0, n), axis=axis)) / (2 * r + 1)).astype(np.float32)
    return a


def ramp(stops, t):
    xs = [s[0] for s in stops]
    return np.stack([np.interp(t, xs, [s[1][c] for s in stops]) for c in range(3)], -1) / 255


def bevel(mask, width):
    """Height that climbs over `width` px inside the shape's edge, so shapes read as cast metal."""
    return np.clip((blur(mask, width * 0.5) - 0.5) * 2.2, 0, 1) * mask


def spline(points, per=24):
    """A Catmull-Rom curve through the points: the smooth line a vine follows."""
    p = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(q, np.float64) for q in p[i - 1:i + 3])
        for t in np.linspace(0, 1, per, endpoint=False):
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(np.array(points[-1], np.float64))
    return np.array(out)


# ---------- the vine ----------

class Mask:
    """A 2x drawing surface for tapered stems, leaves and buds."""

    def __init__(self, c):
        self.c = c
        self.img = Image.new("L", (c.w * SS, c.h * SS))
        self.d = ImageDraw.Draw(self.img)

    def stem(self, pts, w0, w1):
        """A stem along the points, its width going from w0 to w1 (round all along, no corners)."""
        n = len(pts)
        for i in range(n):
            w = (w0 + (w1 - w0) * i / max(1, n - 1)) * SS
            x, y = pts[i][0] * SS, pts[i][1] * SS
            if i:
                self.d.line([(pts[i - 1][0] * SS, pts[i - 1][1] * SS), (x, y)], fill=255, width=max(1, int(round(w))))
            self.d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)

    def leaf(self, x, y, angle, length, width):
        """A rounded leaf from its stalk at (x, y): widest a third of the way, a soft point at the tip."""
        pts = []
        for side in (1, -1):
            ts = np.linspace(0, 1, 18) if side == 1 else np.linspace(1, 0, 18)
            for t in ts:
                half = width / 2 * math.sin(math.pi * t ** 0.75) * (1 - 0.35 * t)
                bend = length * 0.08 * math.sin(math.pi * t)
                lx, ly = t * length, side * half + bend
                pts.append((x + lx * math.cos(angle) - ly * math.sin(angle), y + lx * math.sin(angle) + ly * math.cos(angle)))
        self.d.polygon([(px * SS, py * SS) for px, py in pts], fill=255)

    def curl(self, x, y, angle, size, turn=1, w=2.2):
        """A tendril: leaves the stem at `angle` and winds into a tight spiral."""
        pts = []
        a = angle
        px, py = x, y
        step = size / 16
        for i in range(70):
            k = i / 70
            a += turn * (0.04 + 0.22 * k ** 1.6)
            px += math.cos(a) * step * (1 - 0.6 * k)
            py += math.sin(a) * step * (1 - 0.6 * k)
            pts.append((px, py))
        self.stem(pts, w, 0.6)

    def array(self):
        return np.asarray(self.img, np.float32) / 255


def grow(m, path, rng, width=4.0, leaf_every=26, leaf_size=13, sway=6.0, curls=0.35, buds=None):
    """A vine along `path` (points): it wanders off the line by up to `sway`, puts out leaves on alternating
    sides, now and then a tendril, and records where its buds go (in `buds`)."""
    base = spline(path, 20)
    seg = np.diff(base, axis=0)
    dist = np.concatenate([[0], np.cumsum(np.hypot(seg[:, 0], seg[:, 1]))])
    total = dist[-1]
    ts = np.linspace(0, total, max(8, int(total / 3)))
    xs, ys = np.interp(ts, dist, base[:, 0]), np.interp(ts, dist, base[:, 1])
    tx, ty = np.gradient(xs), np.gradient(ys)
    tl = np.hypot(tx, ty) + 1e-9
    nx, ny = -ty / tl, tx / tl
    phase = rng.uniform(0, 2 * math.pi, 3)
    off = sum(np.sin(ts / L + ph) * a for L, ph, a in zip((23, 41, 77), phase, (0.35, 0.45, 0.6))) * sway
    off *= np.clip(ts / 30, 0, 1) * np.clip((total - ts) / 30, 0, 1)    # starts and ends on the line
    vx, vy = xs + nx * off, ys + ny * off
    m.stem(list(zip(vx, vy)), width, width * 0.35)
    side = 1
    d = rng.uniform(6, leaf_every)
    while d < total - 10:
        i = int(np.searchsorted(ts, d))
        a = math.atan2(ty[i], tx[i]) + side * rng.uniform(0.5, 1.0)
        size = leaf_size * rng.uniform(0.7, 1.15) * (1 - 0.4 * d / total)
        if rng.random() < curls:
            m.curl(vx[i], vy[i], a, size * 1.1, side, width * 0.55)
        else:
            m.leaf(vx[i], vy[i], a, size, size * 0.55)
        if buds is not None and rng.random() < 0.3:
            buds.append((vx[i] + math.cos(a) * size * 0.5, vy[i] + math.sin(a) * size * 0.5))
        side = -side
        d += leaf_every * rng.uniform(0.7, 1.3)
    return vx, vy


# ---------- canvas (premultiplied colour, so light can be added) ----------

class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.x, self.y = grid(w, h)
        self.p = np.zeros((h * SS, w * SS, 3), np.float32)
        self.a = np.zeros((h * SS, w * SS), np.float32)
        self.gp = np.zeros_like(self.p)              # the light alone: the layer CSS animates over the piece
        self.ga = np.zeros_like(self.a)
        self.rng = np.random.default_rng(7)         # the same grain for every theme

    def over(self, col, alpha):
        alpha = np.clip(alpha, 0, 1)[..., None]
        self.p = col * alpha + self.p * (1 - alpha)
        self.a = alpha[..., 0] + self.a * (1 - alpha[..., 0])

    def black(self, alpha):
        self.over(np.zeros_like(self.p), alpha)

    def outline(self, mask, width=2.0, strength=0.95):
        """The logo's black outline, with a soft shadow beyond it."""
        o = np.clip(blur(mask, width * 0.6) * 3, 0, 1)
        self.black(np.maximum(o * strength, blur(mask, width * 2) * 0.55))

    def metal(self, mask, height, stops=CHROME, depth=4.0, flip=False, grain=0.04):
        h = height * depth + blur(self.rng.standard_normal(height.shape).astype(np.float32), 0.35) * grain
        gy, gx = np.gradient(h * SS)
        n = np.stack([-gx, -gy, np.ones_like(gx)], -1)
        n /= np.linalg.norm(n, axis=-1, keepdims=True)
        up = -(2 * n[..., 2] * n[..., 1])           # the reflected view vector's height
        up = -up if flip else up
        col = ramp(stops, np.clip(up * 1.6 + 0.08, -1, 1))
        spec = np.clip(n @ ((LIGHT + [0, 0, 1]) / np.linalg.norm(LIGHT + [0, 0, 1])), 0, 1) ** 60
        self.over(np.clip(col + spec[..., None] * 0.75, 0, 1), mask)

    def glow(self, mask, bloom=3.0, strength=1.0, core=True):
        """Light added on top: a hot core where the seam is, the theme's colour blooming round it."""
        halo = blur(mask, bloom) * 2.2 * strength
        add = GLOW * np.clip(halo, 0, 1.5)[..., None]
        if core:
            add = add + CORE * np.clip(mask * strength, 0, 1)[..., None]
        lit = np.clip(halo + mask * strength, 0, 1)
        self.p = self.p + add
        self.a = 1 - (1 - self.a) * (1 - lit)
        self.gp = self.gp + add
        self.ga = 1 - (1 - self.ga) * (1 - lit)

    def vine(self, mask, depth=3.5):
        """Shades a vine mask: outlined, cast in dark chrome."""
        self.outline(mask, 1.6, 0.9)
        self.metal(mask, bevel(mask, 1.8), VINE, depth)

    def buds(self, points, r=2.2, strength=0.9):
        """Small lit buds on the vine."""
        b = np.zeros_like(self.a)
        for x, y in points:
            b = np.maximum(b, np.clip(1 - np.hypot(self.x - x, self.y - y) / r, 0, 1))
        self.glow(b, r * 1.4, strength)

    def image(self):
        """The piece, and its light alone (for the animated glow layer)."""
        out = []
        for p, a in ((self.p, self.a), (self.gp, self.ga)):
            a = np.clip(a, 0, 1)
            rgb = np.clip(p / np.maximum(a, 1e-4)[..., None], 0, 1)
            out.append(Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), "RGBA").resize((self.w, self.h), Image.LANCZOS))
        return out


def rim(c, d, a, b, depth=4.0):
    """A smooth chrome band between depths a and b of a shape (d = depth inside it)."""
    m = ((d >= a) & (d <= b)).astype(np.float32)
    c.outline(m, 1.8)
    c.metal(m, np.sin(np.pi * np.clip((d - a) / (b - a), 0, 1)), CHROME, depth)
    return m


# ---------- pieces ----------

def frame(size=520, corner=110, seed=11):
    """Card frame, 9-slice 110, stretched (never tiled): a smooth chrome rim with a lit seam inside it, a
    vine weaving along each edge from its own seed, and a knot of leaves, tendrils and a bud in each corner."""
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    d = -rrect(c.x, c.y, 18, 18, size - 18, size - 18, 12)
    rim(c, d, 0, 6, 4.5)
    c.black(((d >= 7) & (d <= 10)).astype(np.float32) * 0.9)
    c.glow(((d >= 8) & (d <= 8.7)).astype(np.float32), 1.6, 0.35)
    m = Mask(c)
    buds = []
    e = 21                                                  # the rim's middle line
    edges = [[(corner * 0.6, e), (size / 2, e), (size - corner * 0.6, e)],
             [(size - e, corner * 0.6), (size - e, size / 2), (size - e, size - corner * 0.6)],
             [(size - corner * 0.6, size - e), (size / 2, size - e), (corner * 0.6, size - e)],
             [(e, size - corner * 0.6), (e, size / 2), (e, corner * 0.6)]]
    for path in edges:
        grow(m, path, rng, 5.2, 34, 19, 6, 0.3, buds)
    for cx, cy, sx, sy in ((e, e, 1, 1), (size - e, e, -1, 1), (size - e, size - e, -1, -1), (e, size - e, 1, -1)):
        for k in range(2):                                  # two stems twisting out of the corner
            a0 = math.atan2(sy, sx) + (0.9 if k else -0.9)
            m.curl(cx + sx * 8, cy + sy * 8, a0, 40 + 10 * k, 1 if (k == 0) == (sx * sy > 0) else -1, 5)
        for a in (0.2, 1.37):
            ang = math.atan2(sy, sx) - math.pi + (a if sx * sy > 0 else -a)
            m.leaf(cx + sx * 4, cy + sy * 4, ang + math.pi, 34, 17)
        buds.append((cx + sx * 6, cy + sy * 6))
    c.vine(m.array())
    c.buds(buds, 2.8, 0.85)
    return c.image()


def frame_thin(size=200, corner=56, seed=5):
    """A lighter frame for forms and menus, 9-slice 56: a thin rim, a curl and a bud in each corner."""
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    d = -rrect(c.x, c.y, 10, 10, size - 10, size - 10, 8)
    rim(c, d, 0, 3.5, 3.5)
    c.glow(((d >= 5.2) & (d <= 5.8)).astype(np.float32), 1.4, 0.3)
    m = Mask(c)
    buds = []
    for cx, cy, sx, sy in ((12, 12, 1, 1), (size - 12, 12, -1, 1), (size - 12, size - 12, -1, -1), (12, size - 12, 1, -1)):
        m.curl(cx, cy, math.atan2(sy, sx) + rng.uniform(-0.4, 0.4), 28, 1 if sx * sy > 0 else -1, 3.6)
        m.leaf(cx, cy, math.atan2(-sy, -sx) + 0.6, 18, 9)
        buds.append((cx + sx * 4, cy + sy * 4))
    c.vine(m.array(), 3)
    c.buds(buds, 1.8, 0.7)
    return c.image()


def button(state, accent=False, w=220, h=44, seed=3):
    """Button, 9-slice 30 left/right and 16 top/bottom (CSS height 44): a rounded chrome rim round a dark
    face, a seam along the bottom that brightens on hover, and a curl of vine hugging each end."""
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    d = -rrect(c.x, c.y, 6, 4, w - 6, h - 4, 11)
    flip = state == "down"
    face = (d >= 4).astype(np.float32)
    rim(c, d, 0, 4, 3.5)
    vert = np.clip(1 - ((c.y - h / 2) / (h / 2 - 8)) ** 2, 0, 1)
    c.metal(face, bevel(face, 4) * 0.5 + vert * 0.3, ACCENT if accent else DARK, 2.5, flip, 0.02)
    hot = {"normal": 0.35, "hover": 0.95, "down": 0.2}[state]
    seam = ((c.y >= h - 10.5) & (c.y <= h - 9.8) & (c.x > 26) & (c.x < w - 26)).astype(np.float32)
    c.glow(seam * face, 1.8, hot)
    if state == "hover":
        c.glow(face * np.exp(-((h - 8 - c.y) / 8) ** 2) * 0.2, 4, 0.6, core=False)
    m = Mask(c)
    for x, turn, a in ((8, 1, -2.2), (w - 8, -1, -0.94)):
        m.curl(x, h / 2 + 6, a, 18, turn, 3)
        m.leaf(x, h / 2 + 6, a + math.pi + turn * 0.4, 12, 6)
    c.vine(m.array(), 2.5)
    c.buds([(8, h / 2 + 6), (w - 8, h / 2 + 6)], 1.6, hot)
    return c.image()


def bar(w=1920, h=96, seed=21):
    """The main bar, stretched across the page (never tiled), on nothing: a chrome rail near the bottom with
    a lit seam under it and one long vine wandering along it, so the vine hangs over whatever is below."""
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    rail = ((c.y >= h - 20) & (c.y <= h - 15)).astype(np.float32)
    c.outline(rail, 1.4)
    c.metal(rail, np.sin(np.pi * np.clip((c.y - (h - 20)) / 5, 0, 1)), CHROME, 3)
    c.glow(((c.y >= h - 12.6) & (c.y <= h - 12)).astype(np.float32), 1.4, 0.5)
    m = Mask(c)
    buds = []
    grow(m, [(-20, h - 17), (w / 3, h - 18), (2 * w / 3, h - 16), (w + 20, h - 17)], rng, 4.6, 40, 17, 7, 0.25, buds)
    c.vine(m.array(), 3)
    c.buds(buds, 2, 0.8)
    return c.image()


def mount(w=340, h=150, seed=8):
    """The crest the logo hangs on in the middle of the bar: a rounded chrome shield with a lit seam round
    its face, vines climbing its sides and curling over its shoulders, a bud at its foot."""
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    m0 = w / 2

    def shield(inset):
        # the shield's outline: square shoulders, sides that round into a soft point
        pts = []
        for t in np.linspace(0, 1, 60):
            y = t * (h - 12 - inset)
            half = (112 - inset) * (1 - t ** 2.2 * 0.92)
            pts.append((m0 + half, y))
        return pts + [(2 * m0 - x, y) for x, y in reversed(pts)]

    img = Image.new("L", (w * SS, h * SS))
    ImageDraw.Draw(img).polygon([(x * SS, y * SS) for x, y in shield(0)], fill=255)
    outer = np.asarray(img, np.float32) / 255
    img = Image.new("L", (w * SS, h * SS))
    ImageDraw.Draw(img).polygon([(x * SS, y * SS) for x, y in shield(9)], fill=255)
    inner = np.asarray(img, np.float32) / 255
    c.outline(outer, 2.4)
    c.metal(np.clip(outer - inner, 0, 1), bevel(outer, 3) * (1 - inner), CHROME, 5)
    c.metal(inner, bevel(inner, 8) * 0.5, DARK, 2.5)
    c.glow(np.clip(inner - bevel(inner, 2.5), 0, 1) * (bevel(inner, 2.5) < 0.2) * inner, 1.8, 0.4)
    m = Mask(c)
    buds = [(m0, h - 14)]
    for sx in (1, -1):
        grow(m, [(m0 + sx * 20, h - 16), (m0 + sx * 70, h - 60), (m0 + sx * 108, 30), (m0 + sx * 150, 8)], rng, 4.8, 26, 17, 4, 0.35, buds)
        m.curl(m0 + sx * 150, 8, math.pi / 2, 28, -sx, 4.2)
    c.vine(m.array())
    c.buds(buds, 2.4, 0.9)
    return c.image()


def ring(size=440, seed=13):
    """A ring for behind the hero logo (CSS turns it slowly): two chrome bands, a vine winding round them
    with leaves and tendrils, buds lit in between."""
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    mid = size / 2
    r = np.hypot(c.x - mid, c.y - mid)
    for a, b in ((176, 183), (140, 144)):
        band = ((r >= a) & (r <= b)).astype(np.float32)
        c.outline(band, 1.8)
        c.metal(band, np.sin(np.pi * np.clip((r - a) / (b - a), 0, 1)), CHROME, 4.5)
    m = Mask(c)
    buds = []
    pts = [(mid + math.cos(t) * (162 + 14 * math.sin(t * 5 + 1)), mid + math.sin(t) * (162 + 14 * math.sin(t * 5 + 1)))
           for t in np.linspace(0, 2 * math.pi * 0.98, 48)]
    grow(m, pts, rng, 5.4, 38, 21, 3, 0.35, buds)
    c.vine(m.array())
    c.buds(buds, 2.4, 0.9)
    return c.image()


def title_plate(w=480, h=52, seed=17):
    """Card title plate, 9-slice 110 left/right: a smooth lens of dark metal in a chrome rim, a vine curling
    out of each end round a lit bud."""
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    cy = h / 2
    half = np.clip(1 - (np.maximum(0, np.abs(c.x - w / 2) - (w / 2 - 90)) / 88) ** 2, 0, 1) * 17
    d = half - np.abs(c.y - cy)
    rim(c, d, 0, 3.5, 3.5)
    face = (d > 3.5).astype(np.float32)
    c.metal(face, bevel(face, 4) * 0.4, DARK, 2)
    c.glow(((d > 4.4) & (d < 5.0)).astype(np.float32) * (np.abs(c.x - w / 2) > w / 2 - 150), 1.4, 0.35)
    m = Mask(c)
    buds = []
    for sx, x0 in ((1, 6), (-1, w - 6)):
        grow(m, [(x0, cy + 2), (x0 + sx * 40, cy + 8), (x0 + sx * 96, cy + 14)], rng, 4.2, 24, 14, 3, 0.4, buds)
        m.curl(x0 + sx * 2, cy, math.pi if sx > 0 else 0, 26, sx, 4)
        buds.append((x0 + sx * 10, cy - 1))
    c.vine(m.array(), 3)
    c.buds(buds, 2, 0.85)
    return c.image()


def divider(w=760, h=44, seed=29):
    """Section divider: a vine reaching out each way from a lit bud, thinning to nothing."""
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    cx, cy = w / 2, h / 2
    m = Mask(c)
    buds = [(cx, cy)]
    for sx in (1, -1):
        grow(m, [(cx + sx * 8, cy), (cx + sx * w * 0.2, cy - 3), (cx + sx * (w / 2 - 14), cy + 2)], rng, 4.6, 30, 15, 6, 0.3, buds)
        m.curl(cx + sx * 6, cy, -math.pi / 2, 22, sx, 3.6)
    c.vine(m.array())
    c.buds(buds, 2.2, 0.9)
    return c.image()


def arrow(state, size=56):
    """Carousel arrow, pointing right (CSS mirrors it): a round chrome boss, a dark face that warms on hover,
    a chrome chevron."""
    c = Canvas(size, size)
    mid = size / 2
    r = np.hypot(c.x - mid, c.y - mid)
    rim(c, (size / 2 - 4) - r, 0, 5, 4)
    face = (r <= size / 2 - 9).astype(np.float32)
    c.metal(face, bevel(face, 4) * 0.4, ACCENT if state == "hover" else DARK, 2)
    img = Image.new("L", (size * SS, size * SS))
    ImageDraw.Draw(img).line([((mid - 5) * SS, (mid - 10) * SS), ((mid + 5) * SS, mid * SS), ((mid - 5) * SS, (mid + 10) * SS)], fill=255, width=5 * SS, joint="curve")
    chevron = np.asarray(img, np.float32) / 255
    if state == "hover":
        c.glow(chevron, 3, 0.7, core=False)
    c.outline(chevron, 1.2)
    c.metal(chevron, bevel(chevron, 2), CHROME, 4)
    return c.image()


PIECES = {
    "frame": frame,
    "frame_thin": frame_thin,
    "bar": bar,
    "mount": mount,
    "ring": ring,
    "title": title_plate,
    "divider": divider,
    "button": lambda: button("normal"),
    "button_hover": lambda: button("hover"),
    "button_down": lambda: button("down"),
    "button_accent": lambda: button("normal", True),
    "button_accent_hover": lambda: button("hover", True),
    "arrow": lambda: arrow("normal"),
    "arrow_hover": lambda: arrow("hover"),
}


# Pieces whose light the site animates on its own layer (`--ui-<piece>-glow`).
GLOWING = ("frame", "bar", "mount", "ring", "title", "divider")


def themes_css(base_url: str) -> str:
    out = ["/* Written by website/art/build.py: each theme's pieces and accent colours. */"]
    for i, (name, rgb) in enumerate(THEMES.items()):
        sel = f':root, [data-theme="{name}"]' if i == 0 else f'[data-theme="{name}"]'
        props = [f"--accent: {hex_of(rgb)}", f"--accent-hot: {hex_of(rgb, 0.35)}", f"--accent-rgb: {', '.join(map(str, rgb))}"]
        props += [f'--ui-{p.replace("_", "-")}: url("{base_url}/{name}/{p}.png")' for p in PIECES]
        props += [f'--ui-{p}-glow: url("{base_url}/{name}/{p}_glow.png")' for p in GLOWING]
        out.append(f"{sel} {{\n  " + ";\n  ".join(props) + ";\n}")
    return "\n".join(out) + "\n"


def build_theme(out: Path, name: str, pieces=None) -> None:
    use_theme(THEMES[name])
    (out / name).mkdir(parents=True, exist_ok=True)
    for piece, draw in PIECES.items():
        if pieces and piece not in pieces:
            continue
        img, light = draw()
        img.save(out / name / f"{piece}.png", optimize=True)
        if piece in GLOWING:
            light.save(out / name / f"{piece}_glow.png", optimize=True)


def build(out: Path, base_url="/config/resources/img/ui", only=None, pieces=None) -> None:
    """Every theme in its own process: the themes share nothing but the shapes."""
    names = [n for n in THEMES if not only or n in only]
    with ProcessPoolExecutor() as pool:
        list(pool.map(build_theme, [out] * len(names), names, [pieces] * len(names)))
    (out / "themes.css").write_text(themes_css(base_url), encoding="utf-8")
    print(f"{len(PIECES)} pieces x {len(names)} themes -> {out}")


if __name__ == "__main__":
    args = sys.argv[1:]
    only = [a[len("--theme="):] for a in args if a.startswith("--theme=")]
    pieces = [a[len("--piece="):] for a in args if a.startswith("--piece=")]
    dirs = [a for a in args if not a.startswith("--")]
    build(Path(dirs[0]) if dirs else Path(__file__).resolve().parent.parent / "config/resources/img/ui", only=only or None, pieces=pieces or None)
