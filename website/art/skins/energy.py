"""Dark energy: cold chrome channels with lightning crawling inside them (the landing page's lightning bar),
lit node studs where channels meet, forks of energy breaking off the corners. Each bolt is its own seed."""
import math

import numpy as np

from engine import CHROME, DARK, Canvas, bevel, frame_shape, lens, rim, round_boss, seam, shield, button_face, along

COLD = [(-1, (40, 50, 66)), (-0.35, (10, 13, 20)), (-0.05, (3, 4, 8)), (0.12, (20, 27, 40)),
        (0.45, (76, 92, 118)), (0.8, (150, 168, 196)), (1, (220, 230, 248))]


def bolt(path, rng, rough=0.22, detail=6):
    """A jagged lightning line along `path` (midpoint displacement, sideways only)."""
    pts = [np.array(p, np.float64) for p in path]
    for _ in range(detail):
        nxt = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            mid = (a + b) / 2
            seg = b - a
            n = np.array([-seg[1], seg[0]]) / (np.hypot(*seg) + 1e-9)
            nxt += [mid + n * rng.normal(0, np.hypot(*seg) * rough), b]
        pts = nxt
    return [tuple(p) for p in pts]


def crackle(c, paths, rng, width=1.1, strength=0.85, forks=0.25):
    """Lightning along each path, with short forks breaking off; light only (it lives on the glow layer)."""
    m = c.mask()
    for path in paths:
        line = bolt(path, rng)
        m.stem(line, width)
        for i in range(4, len(line) - 4, 9):
            if rng.random() < forks:
                x, y = line[i]
                a = rng.uniform(0, 2 * math.pi)
                L = rng.uniform(6, 16)
                m.stem(bolt([(x, y), (x + math.cos(a) * L, y + math.sin(a) * L)], rng, 0.3, 3), width * 0.6)
    c.glow(m.array(), 2.4, strength)


def node(c, x, y, r=7):
    """A chrome stud with a lit core."""
    d = r - np.hypot(c.x - x, c.y - y)
    rim(c, d, 0, r * 0.45, 3, COLD)
    c.metal((d > r * 0.45).astype(np.float32), np.clip(d / r, 0, 1), DARK, 2)
    c.dots([(x, y)], r * 0.4, 1.0)


def channel(c, d, a, b):
    """Two cold rims with a black channel between them where the energy runs."""
    rim(c, d, a, a + 4, 4, COLD)
    c.black(((d > a + 4) & (d < b - 3)).astype(np.float32) * 0.92)
    rim(c, d, b - 3, b, 3, COLD)


def frame(size=520, corner=110, seed=31):
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    d = frame_shape(c, size, 14, 10)
    channel(c, d, 0, 15)
    e, k = 21.5, corner * 0.7
    crackle(c, [[(k, e), (size / 2, e), (size - k, e)], [(size - e, k), (size - e, size / 2), (size - e, size - k)],
                [(size - k, size - e), (size / 2, size - e), (k, size - e)], [(e, size - k), (e, size / 2), (e, k)]], rng)
    for cx, cy, sx, sy in ((e, e, 1, 1), (size - e, e, -1, 1), (size - e, size - e, -1, -1), (e, size - e, 1, -1)):
        crackle(c, [[(cx, cy), (cx + sx * k, cy)], [(cx, cy), (cx, cy + sy * k)],
                    [(cx, cy), (cx + sx * 40, cy + sy * 40)]], rng, 1.3, 1.0, 0.5)
        node(c, cx, cy, 11)
        for t in (0.55, 0.85):
            node(c, cx + sx * corner * t, cy, 4.5)
            node(c, cx, cy + sy * corner * t, 4.5)
    return c.image()


def frame_thin(size=200, seed=7):
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    d = frame_shape(c, size, 8, 6)
    channel(c, d, 0, 9)
    e = 12.5
    crackle(c, [[(30, e), (size - 30, e)], [(size - e, 30), (size - e, size - 30)], [(size - 30, size - e), (30, size - e)], [(e, size - 30), (e, 30)]], rng, 0.9, 0.6, 0.1)
    for cx, cy in ((e, e), (size - e, e), (size - e, size - e), (e, size - e)):
        node(c, cx, cy, 6)
    return c.image()


def button(state, accent=False, w=220, h=44, seed=3):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    hot = button_face(c, state, accent, w, h, COLD, seam_on=False)
    crackle(c, [[(28, h - 10), (w - 28, h - 10)]], rng, 0.9, hot, 0.15)
    for x in (12, w - 12):
        node(c, x, h / 2, 5)
    return c.image()


def bar(w=1920, h=96, seed=41):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    y0 = h - 22
    for a, b in ((y0, y0 + 4), (y0 + 9, y0 + 12)):
        m = ((c.y >= a) & (c.y <= b)).astype(np.float32)
        c.outline(m, 1.3)
        c.metal(m, np.sin(np.pi * np.clip((c.y - a) / (b - a), 0, 1)), COLD, 3)
    c.black(((c.y > y0 + 4) & (c.y < y0 + 9)).astype(np.float32) * 0.9)
    crackle(c, [[(x, y0 + 6.5), (x + 330, y0 + 6.5)] for x in range(-20, w, 320)], rng, 1.1, 0.9, 0.3)
    for x in range(64, w, 256):
        node(c, x, y0 + 6.5, 6)
    return c.image()


def mount(w=340, h=150, seed=9):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    m0 = w / 2
    outer, mid, inner = shield(c, w, h, 0), shield(c, w, h, 5), shield(c, w, h, 12)
    c.outline(outer, 2.4)
    c.metal(np.clip(outer - mid, 0, 1), bevel(outer, 2.5) * (1 - mid), COLD, 4.5)
    c.black(np.clip(mid - inner, 0, 1) * 0.9)
    c.metal(inner, bevel(inner, 8) * 0.5, DARK, 2.5)
    crackle(c, [[(m0 - 104, 4), (m0 - 70, 80), (m0, h - 20)], [(m0 + 104, 4), (m0 + 70, 80), (m0, h - 20)]], rng, 1.2, 0.9, 0.35)
    crackle(c, [[(m0 - 108, 20), (8, 6)], [(m0 + 108, 20), (w - 8, 6)]], rng, 1.0, 0.8, 0.5)
    node(c, m0, h - 20, 9)
    return c.image()


def ring(size=440, seed=19):
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    mid = size / 2
    r = np.hypot(c.x - mid, c.y - mid)
    for a, b in ((180, 185), (162, 165), (138, 142)):
        rim(c, r - a, 0, b - a, 4, COLD)
    for rr, n in ((172, 7), (151, 5)):
        for i in range(n):
            a0 = i / n * 2 * math.pi + rng.uniform(0, 0.5)
            arc = [(mid + math.cos(a0 + t) * rr, mid + math.sin(a0 + t) * rr) for t in np.linspace(0, 2 * math.pi / n * 0.8, 6)]
            crackle(c, [arc], rng, 1.0, 0.85, 0.3)
    for i in range(8):
        a = i / 8 * 2 * math.pi
        node(c, mid + math.cos(a) * 172, mid + math.sin(a) * 172, 6)
    return c.image()


def title(w=480, h=52, seed=23):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    cy = h / 2
    d = lens(c, w, h)
    rim(c, d, 0, 3.5, 3.5, COLD)
    face = (d > 3.5).astype(np.float32)
    c.metal(face, bevel(face, 4) * 0.4, DARK, 2)
    crackle(c, [[(18, cy), (110, cy)], [(w - 18, cy), (w - 110, cy)]], rng, 1.0, 0.9, 0.4)
    node(c, 16, cy, 6)
    node(c, w - 16, cy, 6)
    return c.image()


def divider(w=760, h=44, seed=37):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    cx, cy = w / 2, h / 2
    crackle(c, [[(cx, cy), (16, cy)], [(cx, cy), (w - 16, cy)]], rng, 1.2, 0.9, 0.35)
    node(c, cx, cy, 9)
    return c.image()


def arrow(state, size=56):
    c = Canvas(size, size)
    round_boss(c, state, size, rim_stops=COLD)
    return c.image()
