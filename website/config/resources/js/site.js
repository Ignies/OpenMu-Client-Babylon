// The site's behaviour: menu and dropdowns, the hero carousel and its embers, skeletons, tabs, confirmations,
// and the admin's live appearance preview.
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Loader: the vine grows as the theme's art, the logo, the fonts and the slide images arrive, then it leaves.
// It never waits more than 6 s; a cached visit passes straight through.
const loader = $('[data-loader]');
if (loader) {
  const css = getComputedStyle(document.documentElement);
  const urls = new Set(['/ui/world_select/logo.webp', ...$$('[data-bg]').map(el => el.dataset.bg)]);
  for (const name of ['frame', 'frame-glow', 'bar', 'bar-glow', 'mount', 'mount-glow', 'title', 'title-glow', 'button', 'button-accent', 'ring', 'ring-glow']) {
    const m = css.getPropertyValue(`--ui-${name}`).match(/url\(["']?([^"')]+)/);
    if (m) urls.add(m[1]);
  }
  const jobs = [...urls].map(src => new Promise(done => {
    const img = new Image();
    img.onload = img.onerror = done;
    img.src = src;
  }));
  jobs.push(document.fonts?.ready ?? Promise.resolve());
  let n = 0;
  const step = () => loader.style.setProperty('--p', String(++n / jobs.length));
  const finish = () => {
    loader.classList.add('is-done');
    setTimeout(() => loader.remove(), 800);
  };
  Promise.all(jobs.map(j => j.then(step))).then(finish);
  setTimeout(finish, 6000);
}

// Phone menu: one drawer with both halves of the nav.
$('.nav-toggle')?.addEventListener('click', e => {
  const open = $('.head').classList.toggle('is-open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
});

// Dropdowns (<details class="drop">): one open at a time, closed by a click outside or Escape.
const drops = $$('details.drop');
drops.forEach(d => d.addEventListener('toggle', () => {
  if (d.open) {
    drops.forEach(o => o !== d && (o.open = false));
    $('input', d)?.focus();
  }
}));
document.addEventListener('click', e => drops.forEach(d => d.open && !d.contains(e.target) && (d.open = false)));
document.addEventListener('keydown', e => e.key === 'Escape' && drops.forEach(d => (d.open = false)));

// Skeletons: an image fades in once loaded and clears its .skel parent; [data-bg] art is loaded first.
const loaded = el => {
  el.classList.add('is-loaded');
  el.closest('.skel')?.classList.add('is-loaded');
};
$$('img.fade').forEach(img => (img.complete && img.naturalWidth ? loaded(img) : img.addEventListener('load', () => loaded(img), { once: true })));
$$('[data-bg]').forEach(el => {
  const img = new Image();
  img.onload = () => {
    el.style.backgroundImage = `url("${el.dataset.bg}")`;
    loaded(el);
  };
  img.src = el.dataset.bg;
});

// Hero: fades between slides every 7 s (the active thumbnail's line shows it), paused while hovered.
const hero = $('[data-carousel]');
if (hero) {
  const slides = $$('.slide', hero);
  const thumbs = $$('[data-go]');
  const strip = $('.thumbs');
  const count = $('[data-count]', hero);
  let at = 0;
  let timer = 0;
  const show = i => {
    at = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle('is-on', n === at);
      s.setAttribute('aria-hidden', String(n !== at));
    });
    thumbs.forEach((t, n) => t.classList.toggle('is-on', n === at));
    thumbs[at]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (count) {
      count.textContent = String(at + 1);
      count.style.animation = 'none';
      void count.offsetWidth;
      count.style.animation = '';
    }
  };
  const play = () => {
    clearInterval(timer);
    strip?.classList.remove('is-paused');
    if (!still && slides.length > 1) timer = setInterval(() => show(at + 1), 7000);
  };
  const pause = () => {
    clearInterval(timer);
    strip?.classList.add('is-paused');
  };
  thumbs.forEach(t => t.addEventListener('click', () => { show(Number(t.dataset.go)); play(); }));
  $('[data-prev]')?.addEventListener('click', () => { show(at - 1); play(); });
  $('[data-next]')?.addEventListener('click', () => { show(at + 1); play(); });
  hero.addEventListener('mouseenter', pause);
  hero.addEventListener('mouseleave', play);
  play();
}

// Embers rising through the hero in the theme's colour. One glow sprite drawn many times; nothing is
// allocated per frame, and it stops while off screen or in a hidden tab.
const canvas = $('[data-embers]');
if (canvas && !still) {
  const ctx = canvas.getContext('2d');
  const sprite = document.createElement('canvas');
  const embers = [];
  let w = 0;
  let h = 0;
  let raf = 0;
  let visible = true;
  const paintSprite = () => {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim() || '200, 37, 26';
    sprite.width = sprite.height = 32;
    const s = sprite.getContext('2d');
    const g = s.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 240, 220, 1)');
    g.addColorStop(0.18, `rgba(${rgb}, 0.95)`);
    g.addColorStop(1, `rgba(${rgb}, 0)`);
    s.clearRect(0, 0, 32, 32);
    s.fillStyle = g;
    s.fillRect(0, 0, 32, 32);
  };
  const spawn = (e, anywhere) => {
    e.x = Math.random() * w;
    e.y = anywhere ? Math.random() * h : h + 10;
    e.vy = 0.25 + Math.random() * 0.9;
    e.size = 4 + Math.random() * 12;
    e.phase = Math.random() * Math.PI * 2;
    e.sway = 0.2 + Math.random() * 0.6;
    e.life = 0.4 + Math.random() * 0.6;
  };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = Math.min(90, Math.round((w * h) / 12000));
    while (embers.length < want) {
      const e = {};
      spawn(e, true);
      embers.push(e);
    }
    embers.length = want;
  };
  const frame = t => {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const e of embers) {
      e.y -= e.vy;
      e.x += Math.sin(t / 1400 + e.phase) * e.sway;
      if (e.y < -20) spawn(e, false);
      const fade = Math.min(1, (h - e.y) / 120) * Math.min(1, e.y / 160);
      ctx.globalAlpha = Math.max(0, fade * e.life * (0.6 + 0.4 * Math.sin(t / 300 + e.phase)));
      ctx.drawImage(sprite, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    }
    ctx.globalAlpha = 1;
    raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
  };
  const run = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  };
  paintSprite();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    run();
  }).observe(canvas);
  document.addEventListener('visibilitychange', run);
  new MutationObserver(paintSprite).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  resize();
  run();
}

// Tabs: a [data-tabs] row of [data-tab=<pane id>] buttons shows one pane at a time.
$$('[data-tabs]').forEach(row => row.addEventListener('click', e => {
  const tab = e.target.closest('[data-tab]');
  if (!tab) return;
  $$('[data-tab]', row).forEach(t => {
    t.classList.toggle('is-here', t === tab);
    document.getElementById(t.dataset.tab).hidden = t !== tab;
  });
}));

$$('form[data-confirm]').forEach(f => f.addEventListener('submit', e => {
  if (!confirm(f.dataset.confirm)) e.preventDefault();
}));
$$('[data-confirm-click]').forEach(b => b.addEventListener('click', e => {
  if (!confirm(b.dataset.confirmClick)) e.preventDefault();
}));

// Admin > Appearance: every control previews on the live page before saving.
const form = $('[data-bg-form]');
const bg = $('.bg');
if (form && bg) {
  const vars = {
    color: v => ['--bg-color', v],
    from: v => ['--bg-from', v],
    to: v => ['--bg-to', v],
    angle: v => ['--bg-angle', `${v}deg`],
    tint: v => ['--bg-tint', v],
    tint_strength: v => ['--bg-tint-strength', v / 100],
    art: v => ['--bg-art', v / 100],
    dim: v => ['--bg-dim', v / 100],
    blur: v => ['--bg-blur', `${v}px`],
  };
  form.addEventListener('input', ({ target: t }) => {
    if (t.name === 'theme') document.documentElement.dataset.theme = t.value;
    else if (vars[t.name]) bg.style.setProperty(...vars[t.name](t.value));
    else if (t.type === 'checkbox') bg.classList.toggle(`has-${t.name}`, t.checked);
    else if (t.name === 'type') bg.className = bg.className.replace(/\bbg-(map|image|video|color|gradient)\b/, `bg-${t.value}`);
  });
}
