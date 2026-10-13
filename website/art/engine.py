"""The renderer every skin draws with: masks shaded as metal by reflecting a sky-horizon-ground ramp, light
added as glow (kept on its own layer too, for CSS to animate), and the shared shapes (rims, faces, plates).

The colour of the current theme is set by use_theme(); skins read ACCENT, GLOW and CORE through this module
at draw time (engine.ACCENT), never as copies.
"""
import math

import numpy as np
from PIL import Image, ImageDraw

SS = 2                                    # everything is drawn at 2x and filtered down
LIGHT = np.array([-0.45, -0.8, 1.0])
LIGHT /= np.linalg.norm(LIGHT)

# Reflection ramps, indexed by how much the surface reflects the sky (1) or the ground (-1).
CHROME = [(-1, (46, 56, 70)), (-0.35, (14, 17, 23)), (-0.05, (4, 5, 8)), (0.12, (26, 32, 43)),
          (0.45, (92, 106, 126)), (0.8, (166, 180, 199)), (1, (226, 233, 243))]
DARK = [(-1, (18, 20, 26)), (-0.2, (6, 6, 8)), (0.2, (9, 10, 13)), (1, (28, 32, 40))]

GLOW = CORE = None
ACCENT = []


def use_theme(rgb):
    """Sets the colour everything lit or accented is drawn in."""
    global GLOW, CORE, ACCENT
    base = np.array(rgb, np.float32) / 255
    GLOW = base / base.max() * 0.92
    CORE = base * 0.45 + 0.55
    ACCENT = tinted(rgb)


def tinted(rgb, depth=1.0):
    """A metal ramp in a colour: dark in its shadow, white-hot in its glint."""
    base = np.array(rgb, np.float32) / 255
    mix = lambda f, w: tuple(int(round(255 * min(1, c * f * depth + w))) for c in base)
    return [(-1, mix(0.35, 0)), (-0.35, mix(0.15, 0)), (-0.05, mix(0.05, 0)), (0.12, mix(0.35, 0)),
            (0.45, mix(0.75, 0)), (0.8, mix(0.75, 0.3)), (1, mix(0.3, 0.75))]


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
    """A Catmull-Rom curve through the points."""
    p = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = (np.array(q, np.float64) for q in p[i - 1:i + 3])
        for t in np.linspace(0, 1, per, endpoint=False):
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(np.array(points[-1], np.float64))
    return np.array(out)


def along(path, step=3.0):
    """Evenly spaced points (and unit tangents) along a smooth curve through `path`."""
    base = spline(path, 20)
    seg = np.diff(base, axis=0)
    dist = np.concatenate([[0], np.cumsum(np.hypot(seg[:, 0], seg[:, 1]))])
    ts = np.linspace(0, dist[-1], max(8, int(dist[-1] / step)))
    xs, ys = np.interp(ts, dist, base[:, 0]), np.interp(ts, dist, base[:, 1])
    tx, ty = np.gradient(xs), np.gradient(ys)
    tl = np.hypot(tx, ty) + 1e-9
    return ts, xs, ys, tx / tl, ty / tl


# ---------- drawing ----------

class Mask:
    """A 2x drawing surface for shapes that are then shaded together."""

    def __init__(self, c):
        self.c = c
        self.img = Image.new("L", (c.w * SS, c.h * SS))
        self.d = ImageDraw.Draw(self.img)

    def stem(self, pts, w0, w1=None):
        """A round-ended line along the points, its width going from w0 to w1."""
        w1 = w0 if w1 is None else w1
        n = len(pts)
        for i in range(n):
            w = (w0 + (w1 - w0) * i / max(1, n - 1)) * SS
            x, y = pts[i][0] * SS, pts[i][1] * SS
            if i:
                self.d.line([(pts[i - 1][0] * SS, pts[i - 1][1] * SS), (x, y)], fill=255, width=max(1, int(round(w))))
            self.d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)

    def poly(self, pts):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=255)

    def circle(self, x, y, r):
        self.d.ellipse([(x - r) * SS, (y - r) * SS, (x + r) * SS, (y + r) * SS], fill=255)

    def leaf(self, x, y, angle, length, width):
        """A rounded leaf from its stalk at (x, y): widest a third of the way, a soft point at the tip."""
        pts = []
        for side in (1, -1):
            for t in (np.linspace(0, 1, 18) if side == 1 else np.linspace(1, 0, 18)):
                half = width / 2 * math.sin(math.pi * t ** 0.75) * (1 - 0.35 * t)
                bend = length * 0.08 * math.sin(math.pi * t)
                lx, ly = t * length, side * half + bend
                pts.append((x + lx * math.cos(angle) - ly * math.sin(angle), y + lx * math.sin(angle) + ly * math.cos(angle)))
        self.poly(pts)

    def curl(self, x, y, angle, size, turn=1, w=2.2):
        """A tendril: leaves at `angle` and winds into a tight spiral."""
        pts = []
        a, px, py, step = angle, x, y, size / 16
        for i in range(70):
            k = i / 70
            a += turn * (0.04 + 0.22 * k ** 1.6)
            px += math.cos(a) * step * (1 - 0.6 * k)
            py += math.sin(a) * step * (1 - 0.6 * k)
            pts.append((px, py))
        self.stem(pts, w, 0.6)

    def array(self):
        return np.asarray(self.img, np.float32) / 255


class Canvas:
    """Premultiplied colour, so light can be added; the light alone is kept for the glow layer."""

    def __init__(self, w, h):
        self.w, self.h = w, h
        self.x, self.y = grid(w, h)
        self.p = np.zeros((h * SS, w * SS, 3), np.float32)
        self.a = np.zeros((h * SS, w * SS), np.float32)
        self.gp = np.zeros_like(self.p)
        self.ga = np.zeros_like(self.a)
        self.rng = np.random.default_rng(7)         # the same grain for every theme

    def mask(self):
        return Mask(self)

    def over(self, col, alpha):
        alpha = np.clip(alpha, 0, 1)[..., None]
        self.p = col * alpha + self.p * (1 - alpha)
        self.a = alpha[..., 0] + self.a * (1 - alpha[..., 0])

    def black(self, alpha):
        self.over(np.zeros_like(self.p), alpha)

    def outline(self, mask, width=2.0, strength=0.95):
        """A black outline, with a soft shadow beyond it."""
        o = np.clip(blur(mask, width * 0.6) * 3, 0, 1)
        self.black(np.maximum(o * strength, blur(mask, width * 2) * 0.55))

    def metal(self, mask, height, stops=CHROME, depth=4.0, flip=False, grain=0.04, shine=0.75, sharp=60):
        h = height * depth + blur(self.rng.standard_normal(height.shape).astype(np.float32), 0.35) * grain
        gy, gx = np.gradient(h * SS)
        n = np.stack([-gx, -gy, np.ones_like(gx)], -1)
        n /= np.linalg.norm(n, axis=-1, keepdims=True)
        up = -(2 * n[..., 2] * n[..., 1])
        up = -up if flip else up
        col = ramp(stops, np.clip(up * 1.6 + 0.08, -1, 1))
        spec = np.clip(n @ ((LIGHT + [0, 0, 1]) / np.linalg.norm(LIGHT + [0, 0, 1])), 0, 1) ** sharp
        self.over(np.clip(col + spec[..., None] * shine, 0, 1), mask)

    def flat(self, mask, rgb):
        """A flat colour (ink, paint)."""
        self.over(np.broadcast_to(np.array(rgb, np.float32) / 255, self.p.shape), mask)

    def glow(self, mask, bloom=3.0, strength=1.0, core=True):
        """Light added on top: a hot core where the mask is, the theme's colour blooming round it."""
        halo = blur(mask, bloom) * 2.2 * strength
        add = GLOW * np.clip(halo, 0, 1.5)[..., None]
        if core:
            add = add + CORE * np.clip(mask * strength, 0, 1)[..., None]
        lit = np.clip(halo + mask * strength, 0, 1)
        self.p = self.p + add
        self.a = 1 - (1 - self.a) * (1 - lit)
        self.gp = self.gp + add
        self.ga = 1 - (1 - self.ga) * (1 - lit)

    def dots(self, points, r=2.2, strength=0.9):
        """Small lit points (buds, sparks, nodes)."""
        b = np.zeros_like(self.a)
        for x, y in points:
            b = np.maximum(b, np.clip(1 - np.hypot(self.x - x, self.y - y) / r, 0, 1))
        self.glow(b, r * 1.4, strength)

    def star(self, cx, cy, size, strength=1.0):
        """The four-pointed spark from the logo's O."""
        dx, dy = np.abs(self.x - cx), np.abs(self.y - cy)
        s = np.exp(-dx / (size * 0.06)) * np.exp(-dy / (size * 0.5)) + np.exp(-dy / (size * 0.06)) * np.exp(-dx / (size * 0.5))
        s = s + np.exp(-(dx ** 2 + dy ** 2) / (size * 0.12) ** 2)
        self.glow(np.clip(s, 0, 1) * strength, size * 0.15, strength)

    def image(self):
        """The piece, and its light alone (the layer CSS animates)."""
        out = []
        for p, a in ((self.p, self.a), (self.gp, self.ga)):
            a = np.clip(a, 0, 1)
            rgb = np.clip(p / np.maximum(a, 1e-4)[..., None], 0, 1)
            out.append(Image.fromarray((np.dstack([rgb, a]) * 255).astype(np.uint8), "RGBA").resize((self.w, self.h), Image.LANCZOS))
        return out


# ---------- shared shapes ----------

def rim(c, d, a, b, depth=4.0, stops=CHROME, outline=True):
    """A rounded band between depths a and b of a shape (d = depth inside it)."""
    m = ((d >= a) & (d <= b)).astype(np.float32)
    if outline:
        c.outline(m, 1.8)
    c.metal(m, np.sin(np.pi * np.clip((d - a) / (b - a), 0, 1)), stops, depth)
    return m


def seam(c, d, at, width=0.7, strength=0.4, bloom=1.6):
    """A thin line of light at depth `at` inside a shape."""
    c.glow(((d >= at) & (d <= at + width)).astype(np.float32), bloom, strength)


def frame_shape(c, size, inset, radius):
    return -rrect(c.x, c.y, inset, inset, size - inset, size - inset, radius)


def button_face(c, state, accent, w, h, rim_stops=CHROME, face_stops=None, radius=11, seam_on=True):
    """A rounded button: a rim round a face, a seam of light along the bottom that brightens on hover.
    9-slice 30 left/right and 16 top/bottom (CSS height 44). Returns how hot its light is."""
    d = -rrect(c.x, c.y, 6, 4, w - 6, h - 4, radius)
    flip = state == "down"
    face = (d >= 4).astype(np.float32)
    rim(c, d, 0, 4, 3.5, rim_stops)
    vert = np.clip(1 - ((c.y - h / 2) / (h / 2 - 8)) ** 2, 0, 1)
    c.metal(face, bevel(face, 4) * 0.5 + vert * 0.3, ACCENT if accent else (face_stops or DARK), 2.5, flip, 0.02)
    hot = {"normal": 0.35, "hover": 0.95, "down": 0.2}[state]
    if seam_on:
        line = ((c.y >= h - 10.5) & (c.y <= h - 9.8) & (c.x > 26) & (c.x < w - 26)).astype(np.float32)
        c.glow(line * face, 1.8, hot)
    if state == "hover":
        c.glow(face * np.exp(-((h - 8 - c.y) / 8) ** 2) * 0.2, 4, 0.6, core=False)
    return hot


def lens(c, w, h, ends=90, half=17):
    """Depth inside a title plate: a lens of even height whose ends round off over `ends` px."""
    cy = h / 2
    hh = np.clip(1 - (np.maximum(0, np.abs(c.x - w / 2) - (w / 2 - ends)) / (ends - 2)) ** 2, 0, 1) * half
    return hh - np.abs(c.y - cy)


def shield(c, w, h, inset, width=112, point=0.92):
    """A crest's mask: square shoulders, sides rounding into a soft point."""
    m0 = w / 2
    pts = []
    for t in np.linspace(0, 1, 60):
        pts.append((m0 + (width - inset) * (1 - t ** 2.2 * point), t * (h - 12 - inset)))
    pts += [(2 * m0 - x, y) for x, y in reversed(pts)]
    m = c.mask()
    m.poly(pts)
    return m.array()


def round_boss(c, state, size, accent=False, rim_stops=CHROME, face_stops=None):
    """A round button with a chevron pointing right (CSS mirrors it)."""
    mid = size / 2
    r = np.hypot(c.x - mid, c.y - mid)
    rim(c, (size / 2 - 4) - r, 0, 5, 4, rim_stops)
    face = (r <= size / 2 - 9).astype(np.float32)
    c.metal(face, bevel(face, 4) * 0.4, ACCENT if state == "hover" else (face_stops or DARK), 2)
    m = c.mask()
    m.stem([(mid - 5, mid - 10), (mid + 5, mid), (mid - 5, mid + 10)], 5)
    chevron = m.array()
    if state == "hover":
        c.glow(chevron, 3, 0.7, core=False)
    c.outline(chevron, 1.2)
    c.metal(chevron, bevel(chevron, 2), rim_stops, 4)
