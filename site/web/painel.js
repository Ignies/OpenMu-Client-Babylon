// The dedicated /painel page. It reads one payload from /api/player/page (the player's own panel
// plus the site's public information), so the page works even when the home page is slow. It may be
// served by the site itself or, as painel.<domain>, from its own host: there the API lives at
// /site-api on the same host and the session travels as a bearer token.
const $ = (selector, root = document) => root.querySelector(selector);

const CROSS = window.location.pathname.includes('/site-api/');
const API = CROSS ? '/site-api' : '';
const TOKEN_KEY = 'mucura_panel_token';

const state = { data: null, player: null, token: localStorage.getItem(TOKEN_KEY) || '' };

/** An address on the public site, for links that leave this host. */
function siteHref(path) {
  return CROSS ? `${API}${path.startsWith('/') ? path : `/${path}`}` : path;
}

/** Where the public site lives: this origin, or the site behind the panel host's relay. */
function siteHome(anchor = '') {
  return siteHref(anchor || '/');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  if (!value) return null;
  if ((value.startsWith('/') && !value.startsWith('//')) || value.startsWith('#')) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value) || 0);
}

function formatDate(ms) {
  const date = new Date(ms);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(ms) {
  const date = new Date(ms);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value ?? '';
}

function showToast(message, error = false) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 5200);
}

async function api(path, options = {}) {
  const headers = { accept: 'application/json', ...(options.headers || {}) };
  if (state.token) headers.authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const problem = new Error(body?.error || `Erro ${response.status}`);
    problem.status = response.status;
    throw problem;
  }
  return body;
}

function renderGame(game) {
  const status = $('#panel-game-status');
  const detail = $('#panel-game-detail');
  const tag = $('#panel-game-tag');
  const stats = $('#panel-game-stats');
  if (!game || !game.available) {
    if (status) status.textContent = 'Status indisponível';
    if (tag) tag.textContent = '—';
    if (stats) stats.hidden = true;
    return;
  }
  if (!game.online) {
    if (status) status.textContent = 'Offline';
    if (tag) tag.textContent = 'Offline';
  } else if (!game.inWorld) {
    if (status) status.textContent = 'Na seleção de personagem';
    if (tag) tag.textContent = 'No personagem';
  } else {
    if (status) status.textContent = game.character || 'Personagem online';
    if (tag) tag.textContent = 'No mundo';
  }
  if (detail) {
    if (game.online && game.inWorld) {
      detail.textContent = [game.class_name, game.map_name, `Nível ${formatNumber(game.level)}`]
        .filter(Boolean)
        .join(' • ');
    } else if (game.online) {
      detail.textContent = 'Escolha um personagem no jogo para ver os detalhes aqui.';
    } else {
      detail.textContent = 'Entre no jogo com este login para acompanhar o personagem.';
    }
  }
  if (!stats) return;
  if (!game.online || !game.inWorld) {
    stats.hidden = true;
    stats.innerHTML = '';
    return;
  }
  stats.hidden = false;
  const rows = [
    ['Nível', formatNumber(game.level)],
    ['Zen', formatNumber(game.money)],
    ['Vida', game.maxHp > 0 ? `${formatNumber(game.hp)} / ${formatNumber(game.maxHp)}` : '—'],
    ['Mapa', game.map_name || '—'],
    ['Posição', `${formatNumber(game.x)}, ${formatNumber(game.y)}`],
    ['Guild', game.guild || '—'],
  ];
  stats.innerHTML = rows
    .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join('');
}

function renderVip(data) {
  const vip = data.vip || {};
  const badge = $('#panel-vip-badge');
  if (badge) {
    badge.textContent = vip.active ? vip.planName || 'VIP' : 'Jogador';
    badge.classList.toggle('active', Boolean(vip.active));
  }
  setText(
    '#panel-vip-status',
    vip.active
      ? `VIP ativo até ${formatDate(vip.expiresAt)}`
      : 'Sua conta ainda não tem VIP ativo.'
  );
  setText(
    '#panel-vip-detail',
    vip.active
      ? `${vip.planName || 'VIP'} • ${formatNumber(vip.daysLeft)} dia(s) restante(s) • começou em ${formatDate(vip.startsAt)}.`
      : 'O VIP é opcional e ajuda a manter o servidor online. Veja os planos e escolha o seu.'
  );

  const box = $('#panel-vip-history');
  if (!box) return;
  const rows = Array.isArray(data.vip_history) ? data.vip_history : [];
  if (!rows.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML =
    '<span class="user-game-label">Histórico VIP</span>' +
    `<ul>${rows
      .map(
        row =>
          `<li class="${row.active ? 'active' : 'past'}">` +
          `<strong>${escapeHtml(row.plan_name || 'VIP')}</strong>` +
          `<span>${escapeHtml(formatDate(row.starts_at))} até ${escapeHtml(formatDate(row.expires_at))}</span>` +
          (row.active ? '<em>ativo</em>' : '') +
          '</li>'
      )
      .join('')}</ul>`;
}

function syncMapButton() {
  const select = $('#panel-map-select');
  const button = $('#panel-map-button');
  const data = state.data;
  if (!select || !button) return;
  button.disabled =
    !select.value || !data?.panel?.allowed || !data?.game?.online || !data?.game?.inWorld;
}

function renderMap(data) {
  const select = $('#panel-map-select');
  if (select) {
    const maps = Array.isArray(data.maps) ? data.maps : [];
    const selected = select.value;
    select.innerHTML =
      '<option value="">Escolha o destino</option>' +
      maps
        .map(
          map =>
            `<option value="${escapeHtml(map.id)}">${escapeHtml(map.name)} - Nv ${escapeHtml(map.level)} • ${escapeHtml(formatNumber(map.zen))} zen</option>`
        )
        .join('');
    if (selected) select.value = selected;
    select.disabled = !data.panel?.allowed || !data.game?.online || !data.game?.inWorld;
  }
  const note = $('#panel-map-note');
  if (note) {
    note.classList.toggle('locked', Boolean(data.panel?.vip_only && !data.vip?.active));
    if (!data.panel?.allowed) note.textContent = data.panel?.message || 'A troca de mapa pelo site é exclusiva para VIP.';
    else if (!data.game?.available) note.textContent = 'Não foi possível consultar o jogo agora. Tente novamente em instantes.';
    else if (!data.game.online) note.textContent = 'Entre no jogo para trocar de mapa pelo site.';
    else if (!data.game.inWorld) note.textContent = 'Selecione um personagem no jogo para trocar de mapa.';
    else note.textContent = data.panel?.message || '';
  }
  syncMapButton();
}

function renderServer(site, online) {
  const server = site.server || {};
  const info = $('#panel-server-info');
  if (info) {
    const rows = Array.isArray(server.facts) ? [...server.facts] : [];
    rows.push({ label: 'Idioma', value: server.language || '—' });
    info.innerHTML = rows
      .map(row => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`)
      .join('');
  }

  const rates = server.rates || {};
  const strip = $('#panel-rates');
  if (strip) {
    strip.innerHTML = [
      ['EXP', rates.exp || '—'],
      ['Drop', rates.drop || '—'],
      ['Master', rates.master || '—'],
    ]
      .map(
        ([label, value]) => `<div class="rate"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
      )
      .join('');
  }
  setText(
    '#panel-rates-note',
    online?.available
      ? `${formatNumber(online.online)} jogador(es) online agora.`
      : 'Contagem de jogadores indisponível no momento.'
  );

  const rows = $('#panel-server-facts');
  if (rows) {
    rows.innerHTML = [
      ['Servidor', server.name || '—'],
      ['Versão', server.version || '—'],
      ['Jogadores online', online?.available ? formatNumber(online.online) : '—'],
    ]
      .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
      .join('');
  }
  setText('#panel-online', online?.available ? `${formatNumber(online.online)} online` : 'Offline');
}

function renderHeroFacts(site) {
  const facts = $('#panel-facts');
  if (!facts) return;
  // Facts the server card does not already show, so the same row never repeats twice on screen.
  const rows = (Array.isArray(site.server?.facts) ? site.server.facts : [])
    .filter(row => !/season/i.test(row.label))
    .slice(0, 3);
  facts.innerHTML = rows
    .map(row => `<div><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd></div>`)
    .join('');
}

function rankingRow(entry) {
  const position = entry.position;
  const rankClass = position === 1 ? 'gold' : position === 2 ? 'silver' : position === 3 ? 'bronze' : '';
  return `
    <div class="ranking-row">
      <span class="rank ${rankClass}">${escapeHtml(position)}</span>
      <span class="ranking-name">
        <strong>${escapeHtml(entry.name)}</strong>
        <small>${escapeHtml(entry.level ? `Nível ${entry.level}` : 'Nível —')}${escapeHtml(entry.className ? ` • ${entry.className}` : '')}</small>
      </span>
      <span class="ranking-value">
        <strong>${escapeHtml(formatNumber(entry.experience))}</strong>
        <small>XP</small>
      </span>
    </div>`;
}

function renderRanking(rankings) {
  const box = $('#panel-ranking');
  if (!box) return;
  if (!rankings || !rankings.available) {
    box.innerHTML = `<div class="ranking-empty">${escapeHtml(rankings?.error || 'Ranking indisponível agora.')}</div>`;
    return;
  }
  box.innerHTML = rankings.top?.length
    ? rankings.top.slice(0, 5).map(rankingRow).join('')
    : '<div class="ranking-empty">Nenhum personagem no ranking ainda.</div>';
}

function renderNews(news) {
  const box = $('#panel-news');
  if (!box) return;
  if (!Array.isArray(news) || !news.length) {
    box.innerHTML = '<div class="ranking-empty">Nenhuma notícia publicada ainda.</div>';
    return;
  }
  box.innerHTML = news
    .map(
      item => `
        <a class="panel-news-item" href="/noticias/${encodeURIComponent(item.slug)}">
          <span class="tag">${escapeHtml(item.category)}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(formatDateTime(item.created_at))}</small>
        </a>`
    )
    .join('');
}

function resolveLink(value, urls) {
  if (value === '@register') return safeUrl(urls.register);
  if (value === '@play') return safeUrl(urls.play);
  return safeUrl(value);
}

function renderLinks(site) {
  const box = $('#panel-links');
  if (!box) return;
  const links = Array.isArray(site.links) ? site.links : [];
  box.innerHTML = links
    .map(item => {
      const href = resolveLink(item.url, site.urls || {});
      const label = href ? `<a href="${escapeHtml(href)}">${escapeHtml(item.label)}</a>` : escapeHtml(item.label);
      return `<span class="panel-link${href ? '' : ' disabled'}">${label}<small>${escapeHtml(item.description || '')}</small></span>`;
    })
    .join('');
}

function renderPanel(data) {
  state.data = data;
  const site = data.site || {};
  const player = state.player || { account: data.account };
  setText('#panel-account', player.account);
  setText('#brand-name', site.site?.name || 'MUCURA');
  setText('#brand-tagline', site.site?.tagline || '97d');

  const game = data.game;
  setText(
    '#panel-greeting',
    game?.available && game.online
      ? `Sua conta está conectada ao jogo${game.character ? ` como ${game.character}` : ''}.`
      : 'Confira abaixo o seu personagem, o VIP e as novidades do servidor.'
  );

  renderGame(game);
  renderVip(data);
  renderMap(data);
  renderServer(site, data.online);
  renderHeroFacts(site);
  renderRanking(data.rankings);
  renderNews(data.news);
  renderLinks(site);

  const supportEl = $('#panel-support');
  if (supportEl) {
    const email = site.support_email || 'luizfelper@gmail.com';
    supportEl.textContent = email;
    supportEl.href = `mailto:${email}`;
  }
  setText('#panel-support-note', data.profile?.email_hint ? `Conta cadastrada: ${data.profile.email_hint}` : '');
  const play = $('#panel-play');
  const playUrl = safeUrl(site.urls?.play);
  if (play && playUrl) {
    play.href = playUrl;
    play.target = '_blank';
    play.rel = 'noopener';
  }
}

function showLogin() {
  $('#login-card').hidden = false;
  $('#panel-content').hidden = true;
  $('#logout').hidden = true;
  $('#top-login').hidden = false;
  setTimeout(() => $('#login-account')?.focus(), 30);
}

function showPanel() {
  $('#login-card').hidden = true;
  $('#panel-content').hidden = false;
  $('#logout').hidden = false;
  $('#top-login').hidden = true;
}

async function loadPanel() {
  showPanel();
  const content = $('#panel-content');
  try {
    const data = await api('/api/player/page');
    state.data = data;
    renderPanel(data);
    content?.classList.remove('is-loading');
  } catch (error) {
    if (error.status === 401) {
      forgetSession();
      showLogin();
      return;
    }
    showToast(error.message || 'Não foi possível carregar o painel.', true);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const account = $('#login-account')?.value.trim() || '';
  const password = $('#login-password')?.value || '';
  const error = $('#login-error');
  const submit = $('#login-submit');
  if (error) error.hidden = true;
  if (!account || !password) {
    if (error) {
      error.textContent = 'Informe a conta e a senha.';
      error.hidden = false;
    }
    return;
  }
  if (submit) {
    submit.disabled = true;
    submit.textContent = 'Entrando...';
  }
  try {
    const result = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ account, password }),
    });
    state.player = result.player;
    if (result.token) {
      state.token = result.token;
      localStorage.setItem(TOKEN_KEY, result.token);
    }
    const passwordInput = $('#login-password');
    if (passwordInput) passwordInput.value = '';
    showToast(`Bem-vindo, ${result.player.account}!`);
    await loadPanel();
  } catch (problem) {
    if (error) {
      error.textContent = problem.message || 'Não foi possível entrar.';
      error.hidden = false;
    }
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = 'Entrar no painel';
    }
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    // The cookie may already be gone; the page shows the login form either way.
  }
  forgetSession();
  showLogin();
  showToast('Você saiu da conta.');
}

function forgetSession() {
  state.player = null;
  state.data = null;
  state.token = '';
  localStorage.removeItem(TOKEN_KEY);
}

async function changeMap() {
  const select = $('#panel-map-select');
  const button = $('#panel-map-button');
  const mapId = select?.value || '';
  if (!mapId) return;
  if (button) {
    button.disabled = true;
    button.textContent = 'Enviando...';
  }
  try {
    const result = await api('/api/player/warp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ map: mapId }),
    });
    showToast(result.message || 'Pedido de troca de mapa enviado ao jogo.');
    if (select) select.value = '';
    setTimeout(() => loadPanel(), 2000);
  } catch (error) {
    showToast(error.message || 'Não foi possível trocar de mapa.', true);
  } finally {
    if (button) button.textContent = 'Ir';
    syncMapButton();
  }
}

async function init() {
  document.title = 'Painel — MUCURA';
  $('#login-form')?.addEventListener('submit', handleLogin);
  $('#logout')?.addEventListener('click', logout);
  $('#top-login')?.addEventListener('click', showLogin);
  $('#panel-map-select')?.addEventListener('change', syncMapButton);
  $('#panel-map-button')?.addEventListener('click', changeMap);

  // Every "go back to the site" link lands on the public site, wherever it is hosted.
  [...document.querySelectorAll('[data-site-link]')].forEach(link => {
    const anchor = link.getAttribute('href') || '';
    link.href = siteHome(anchor.startsWith('#') ? anchor : '');
  });
  const brand = $('.brand');
  if (brand) brand.href = siteHome();

  // Without a token (the page's own host) the site cookie alone identifies the session on its origin.
  try {
    const me = await api('/api/auth/me');
    state.player = me?.player || null;
  } catch {
    state.player = null;
  }

  if (!state.player) {
    forgetSession();
    showLogin();
    return;
  }

  try {
    const me = await api('/api/auth/me');
    state.player = me?.player || null;
  } catch {
    state.player = null;
  }

  if (!state.player) {
    showLogin();
    return;
  }
  await loadPanel();
  setTimeout(() => {
    if (state.player) loadPanel();
  }, 60_000);
}

init();
