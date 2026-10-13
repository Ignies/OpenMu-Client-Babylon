"""Vine: dark chrome with flowing vines (tapered stems, rounded leaves, curling tendrils, lit buds). Every
edge grows its own vine from its own seed, so nothing repeats."""
import math

import numpy as np

import engine as E
from engine import CHROME, DARK, Canvas, bevel, frame_shape, lens, rim, round_boss, seam, shield, button_face, along

VINE = [(-1, (34, 40, 50)), (-0.35, (10, 12, 16)), (-0.05, (4, 5, 7)), (0.12, (20, 24, 32)),
        (0.45, (70, 80, 96)), (0.8, (132, 144, 162)), (1, (196, 204, 218))]


def grow(m, path, rng, width=4.0, leaf_every=26, leaf_size=13, sway=6.0, curls=0.35, buds=None):
    """A vine along `path`: it wanders off the line by up to `sway`, puts out leaves on alternating sides,
    now and then a tendril, and records where its buds go (in `buds`)."""
    ts, xs, ys, tx, ty = along(path)
    total = ts[-1]
    nx, ny = -ty, tx
    phase = rng.uniform(0, 2 * math.pi, 3)
    off = sum(np.sin(ts / L + ph) * a for L, ph, a in zip((23, 41, 77), phase, (0.35, 0.45, 0.6))) * sway
    off *= np.clip(ts / 30, 0, 1) * np.clip((total - ts) / 30, 0, 1)
    vx, vy = xs + nx * off, ys + ny * off
    m.stem(list(zip(vx, vy)), width, width * 0.35)
    side, d = 1, rng.uniform(6, leaf_every)
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


def shade(c, m, buds, depth=3.5, bud=2.4):
    mask = m.array()
    c.outline(mask, 1.6, 0.9)
    c.metal(mask, bevel(mask, 1.8), VINE, depth)
    c.dots(buds, bud, 0.85)


def frame(size=520, corner=110, seed=11):
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    d = frame_shape(c, size, 18, 12)
    rim(c, d, 0, 6, 4.5)
    c.black(((d >= 7) & (d <= 10)).astype(np.float32) * 0.9)
    seam(c, d, 8, 0.7, 0.35)
    m, buds, e = c.mask(), [], 21
    edges = [[(corner * 0.6, e), (size / 2, e), (size - corner * 0.6, e)],
             [(size - e, corner * 0.6), (size - e, size / 2), (size - e, size - corner * 0.6)],
             [(size - corner * 0.6, size - e), (size / 2, size - e), (corner * 0.6, size - e)],
             [(e, size - corner * 0.6), (e, size / 2), (e, corner * 0.6)]]
    for path in edges:
        grow(m, path, rng, 5.2, 34, 19, 6, 0.3, buds)
    for cx, cy, sx, sy in ((e, e, 1, 1), (size - e, e, -1, 1), (size - e, size - e, -1, -1), (e, size - e, 1, -1)):
        for k in range(2):
            a0 = math.atan2(sy, sx) + (0.9 if k else -0.9)
            m.curl(cx + sx * 8, cy + sy * 8, a0, 40 + 10 * k, 1 if (k == 0) == (sx * sy > 0) else -1, 5)
        for a in (0.2, 1.37):
            ang = math.atan2(sy, sx) - math.pi + (a if sx * sy > 0 else -a)
            m.leaf(cx + sx * 4, cy + sy * 4, ang + math.pi, 34, 17)
        buds.append((cx + sx * 6, cy + sy * 6))
    shade(c, m, buds, bud=2.8)
    return c.image()


def frame_thin(size=200, seed=5):
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    d = frame_shape(c, size, 10, 8)
    rim(c, d, 0, 3.5, 3.5)
    seam(c, d, 5.2, 0.6, 0.3, 1.4)
    m, buds = c.mask(), []
    for cx, cy, sx, sy in ((12, 12, 1, 1), (size - 12, 12, -1, 1), (size - 12, size - 12, -1, -1), (12, size - 12, 1, -1)):
        m.curl(cx, cy, math.atan2(sy, sx) + rng.uniform(-0.4, 0.4), 28, 1 if sx * sy > 0 else -1, 3.6)
        m.leaf(cx, cy, math.atan2(-sy, -sx) + 0.6, 18, 9)
        buds.append((cx + sx * 4, cy + sy * 4))
    shade(c, m, buds, 3, 1.8)
    return c.image()


def button(state, accent=False, w=220, h=44):
    c = Canvas(w, h)
    hot = button_face(c, state, accent, w, h)
    m = c.mask()
    for x, turn, a in ((8, 1, -2.2), (w - 8, -1, -0.94)):
        m.curl(x, h / 2 + 6, a, 18, turn, 3)
        m.leaf(x, h / 2 + 6, a + math.pi + turn * 0.4, 12, 6)
    mask = m.array()
    c.outline(mask, 1.6, 0.9)
    c.metal(mask, bevel(mask, 1.8), VINE, 2.5)
    c.dots([(8, h / 2 + 6), (w - 8, h / 2 + 6)], 1.6, hot)
    return c.image()


def bar(w=1920, h=96, seed=21):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    railm = ((c.y >= h - 20) & (c.y <= h - 15)).astype(np.float32)
    c.outline(railm, 1.4)
    c.metal(railm, np.sin(np.pi * np.clip((c.y - (h - 20)) / 5, 0, 1)), CHROME, 3)
    c.glow(((c.y >= h - 12.6) & (c.y <= h - 12)).astype(np.float32), 1.4, 0.5)
    m, buds = c.mask(), []
    grow(m, [(-20, h - 17), (w / 3, h - 18), (2 * w / 3, h - 16), (w + 20, h - 17)], rng, 4.6, 40, 17, 7, 0.25, buds)
    shade(c, m, buds, 3, 2)
    return c.image()


def mount(w=340, h=150, seed=8):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    m0 = w / 2
    outer, inner = shield(c, w, h, 0), shield(c, w, h, 9)
    c.outline(outer, 2.4)
    c.metal(np.clip(outer - inner, 0, 1), bevel(outer, 3) * (1 - inner), CHROME, 5)
    c.metal(inner, bevel(inner, 8) * 0.5, DARK, 2.5)
    c.glow(np.clip(inner - bevel(inner, 2.5), 0, 1) * (bevel(inner, 2.5) < 0.2) * inner, 1.8, 0.4)
    m, buds = c.mask(), [(m0, h - 14)]
    for sx in (1, -1):
        grow(m, [(m0 + sx * 20, h - 16), (m0 + sx * 70, h - 60), (m0 + sx * 108, 30), (m0 + sx * 150, 8)], rng, 4.8, 26, 17, 4, 0.35, buds)
        m.curl(m0 + sx * 150, 8, math.pi / 2, 28, -sx, 4.2)
    shade(c, m, buds)
    return c.image()


def ring(size=440, seed=13):
    c = Canvas(size, size)
    rng = np.random.default_rng(seed)
    mid = size / 2
    r = np.hypot(c.x - mid, c.y - mid)
    for a, b in ((176, 183), (140, 144)):
        rim(c, r - a, 0, b - a, 4.5)
    m, buds = c.mask(), []
    pts = [(mid + math.cos(t) * (162 + 14 * math.sin(t * 5 + 1)), mid + math.sin(t) * (162 + 14 * math.sin(t * 5 + 1)))
           for t in np.linspace(0, 2 * math.pi * 0.98, 48)]
    grow(m, pts, rng, 5.4, 38, 21, 3, 0.35, buds)
    shade(c, m, buds)
    return c.image()


def title(w=480, h=52, seed=17):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    cy = h / 2
    d = lens(c, w, h)
    rim(c, d, 0, 3.5, 3.5)
    face = (d > 3.5).astype(np.float32)
    c.metal(face, bevel(face, 4) * 0.4, DARK, 2)
    c.glow(((d > 4.4) & (d < 5.0)).astype(np.float32) * (np.abs(c.x - w / 2) > w / 2 - 150), 1.4, 0.35)
    m, buds = c.mask(), []
    for sx, x0 in ((1, 6), (-1, w - 6)):
        grow(m, [(x0, cy + 2), (x0 + sx * 40, cy + 8), (x0 + sx * 96, cy + 14)], rng, 4.2, 24, 14, 3, 0.4, buds)
        m.curl(x0 + sx * 2, cy, math.pi if sx > 0 else 0, 26, sx, 4)
        buds.append((x0 + sx * 10, cy - 1))
    shade(c, m, buds, 3, 2)
    return c.image()


def divider(w=760, h=44, seed=29):
    c = Canvas(w, h)
    rng = np.random.default_rng(seed)
    cx, cy = w / 2, h / 2
    m, buds = c.mask(), [(cx, cy)]
    for sx in (1, -1):
        grow(m, [(cx + sx * 8, cy), (cx + sx * w * 0.2, cy - 3), (cx + sx * (w / 2 - 14), cy + 2)], rng, 4.6, 30, 15, 6, 0.3, buds)
        m.curl(cx + sx * 6, cy, -math.pi / 2, 22, sx, 3.6)
    shade(c, m, buds, bud=2.2)
    return c.image()


def arrow(state, size=56):
    c = Canvas(size, size)
    round_boss(c, state, size)
    return c.image()
