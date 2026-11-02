// Editable content and payment settings. Everything the public site shows comes from here,
// so the owner can change it in /admin without a deploy.
import {
  CLIENT_URL,
  REGISTER_URL,
  SERVER_DESCRIPTION,
  SERVER_LANGUAGE,
  SERVER_NAME,
  SERVER_VERSION,
} from './config';
import { getSetting, setSetting } from './db';
import { HttpError, booleanField, numberField, optionalString, safeHttpUrl, stringField } from './http';
import { syncJewelDropSummary, syncVipPlans } from './openmu';
import { DEFAULT_PLANS, jewelDropSummary, parsePlans, renameTierPlans, upgradeTierBenefits, type VipPlan } from './plans';

export type ServerFact = { label: string; value: string };
export type EventItem = { title: string; schedule: string; description: string };
export type FaqItem = { question: string; answer: string };
export type LinkItem = { label: string; url: string; description: string };
export type SocialLinks = {
  discord: string;
  instagram: string;
  youtube: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
};

export type MpSettings = {
  enabled: boolean;
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
  sandbox: boolean;
  statementDescriptor: string;
};

const DEFAULTS: Record<string, string> = {
  site_name: 'MUCURA',
  site_tagline: '97d • Servidor Brasileiro',
  hero_eyebrow: 'O servidor que respira MU',
  hero_title: 'A lenda renasce.',
  hero_subtitle: 'Entre em MUCURA e escreva a sua história.',
  hero_text: 'Um servidor feito para durar.',
  vip_notice:
    'Mais experiência, vantagens exclusivas e destaque no ranking, e você ajuda a manter o servidor no ar.',
  support_email: 'luizfelper@gmail.com',
  server_name: SERVER_NAME,
  server_description: SERVER_DESCRIPTION,
  server_version: SERVER_VERSION,
  server_language: SERVER_LANGUAGE,
  rate_exp: '1000x',
  rate_drop: '50%',
  rate_master: '500x',
  server_info: JSON.stringify([
    { label: 'Abertura', value: 'Servidor permanente' },
    { label: 'Season', value: '97d' },
    { label: 'Level máximo', value: '400 + Master' },
    { label: 'Reset', value: 'Automático' },
  ] satisfies ServerFact[]),
  events: JSON.stringify([
    {
      title: 'Invasão de Boss',
      schedule: 'Terças e sextas • 20:00',
      description: 'Bosses especiais com drop aumentado em todos os mapas.',
    },
    {
      title: 'Guerra de Guilds',
      schedule: 'Sábados • 21:00',
      description: 'A disputa pelo castelo vale buffs para toda a guild vencedora.',
    },
    {
      title: 'XP em Dobro',
      schedule: 'Domingos • o dia todo',
      description: 'Todo domingo a experiência do servidor dobra.',
    },
  ] satisfies EventItem[]),
  rules: JSON.stringify([
    'Respeite todos os jogadores. Ofensas, racismo e assédio não são tolerados.',
    'É proibido usar cheats, macros externos, bots ou qualquer automação não oferecida pelo jogo.',
    'Não compartilhe sua conta. A segurança dela é sua responsabilidade.',
    'Explorar bugs para vantagem própria é proibido. Reporte o bug e receba recompensa.',
    'É proibido vender itens ou personagens por dinheiro real fora do site oficial.',
    'Anúncios de outros servidores no chat global ou no Discord resultam em banimento.',
    'A equipe pode alterar regras e eventos quando necessário; o aviso será publicado no site.',
    'Ao jogar, você concorda com estas regras e com os termos de uso.',
  ] satisfies string[]),
  faq: JSON.stringify([
    {
      question: 'Como começo a jogar?',
      answer:
        'Crie sua conta no site de registro, baixe ou abra o cliente no navegador e faça login com o mesmo usuário e senha.',
    },
    {
      question: 'O servidor é gratuito?',
      answer:
        'Sim. Você pode jogar do início ao fim sem pagar nada. O VIP é opcional e serve para manter o servidor online.',
    },
    {
      question: 'O que o VIP inclui?',
      answer:
        'Os benefícios de cada plano aparecem na seção VIP. Eles podem mudar com aviso no site.',
    },
    {
      question: 'Como funciona o pagamento?',
      answer:
        'O pagamento é processado pelo Mercado Pago. O site não armazena dados de cartão. Assim que o pagamento é aprovado, o VIP é liberado para a conta informada.',
    },
    {
      question: 'Perdi minha senha. E agora?',
      answer:
        'Fale com a equipe no Discord com o nome da conta e, se possível, o e-mail cadastrado. Nunca envie sua senha para ninguém.',
    },
    {
      question: 'Posso jogar pelo celular?',
      answer:
        'Sim, o cliente roda no navegador e se adapta a telas menores. Para a melhor experiência, use um computador.',
    },
  ] satisfies FaqItem[]),
  links: JSON.stringify([
    { label: 'Criar conta', url: '@register', description: 'Abra sua conta e comece agora.' },
    { label: 'Jogar no navegador', url: '@play', description: 'O cliente abre direto no seu navegador.' },
    { label: 'Discord', url: '', description: 'Comunidade, suporte e avisos.' },
    { label: 'Ranking', url: '/ranking', description: 'Veja os maiores heróis do servidor.' },
  ] satisfies LinkItem[]),
  social: JSON.stringify({
    discord: '',
    instagram: '',
    youtube: '',
    facebook: '',
    tiktok: '',
    whatsapp: '',
  } satisfies SocialLinks),
  vip_plans: JSON.stringify(DEFAULT_PLANS),
  mp_enabled: 'off',
  mp_access_token: '',
  mp_public_key: '',
  mp_webhook_secret: '',
  mp_sandbox: 'on',
  mp_statement_descriptor: 'MUCURA VIP',
  user_panel_vip_only: 'on',
};

export function ensureDefaults(): void {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (getSetting(key) === undefined) setSetting(key, value);
  }
  upgradeHomeCopy();
  upgradeTierPlans();
  syncGamePlansOnBoot();
}

/**
 * Sends the saved plans to the game at boot. A plan saved before the game had a column (the jewel
 * chance) would otherwise keep the column's zero until the admin saves the plans again.
 */
function syncGamePlansOnBoot(): void {
  syncGamePlans(getPlans());
}

/** Sends the plans to the game (the numbers) and their summary to the game's admin panel. */
function syncGamePlans(plans: VipPlan[]): void {
  syncVipPlans(plans.map(plan => ({ id: plan.id, ...plan.game })))
    .then(() => syncJewelDropSummary(jewelDropSummary(plans)))
    .catch(error => console.warn(`VIP plan sync failed: ${(error as Error).message}`));
}

/** Replaces old default copy without touching text the admin wrote. */
function upgradeHomeCopy(): void {
  const hero = getSetting('hero_text');
  if (
    hero ===
    'Um servidor brasileiro feito para durar: progressão justa, eventos toda semana e uma comunidade que joga junto.'
  ) {
    setSetting('hero_text', DEFAULTS.hero_text);
  }

  const vip = getSetting('vip_notice');
  const oldVipDefaults = [
    'O VIP é opcional. Cada plano ajuda a manter o servidor online e faz o MUCURA crescer junto com você.',
    'O VIP é opcional. Cada plano ajuda a manter o servidor online e libera vantagens cadastradas pela administração.',
  ];
  if (vip && oldVipDefaults.includes(vip)) setSetting('vip_notice', DEFAULTS.vip_notice);
}

/**
 * Plans saved before the tiers had names keep whatever the admin priced; only a generic name
 * ("Vip 1") becomes the tier name ("VIP Bronze"). Old default benefit lists are replaced with the
 * current explicit lists, while anything the admin edited is left alone. Writes only when
 * something actually changes.
 */
function upgradeTierPlans(): void {
  let plans: VipPlan[];
  try {
    plans = parsePlans(getJson<unknown>('vip_plans', DEFAULT_PLANS));
  } catch {
    return;
  }

  const renamed = renameTierPlans(plans);
  const upgraded = upgradeTierBenefits(renamed);
  if (upgraded !== plans) setSetting('vip_plans', JSON.stringify(upgraded));
}

export function get(key: string): string {
  return getSetting(key) ?? DEFAULTS[key] ?? '';
}

export function getJson<T>(key: string, fallback: T): T {
  const raw = getSetting(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getPlans(): VipPlan[] {
  try {
    return parsePlans(getJson<unknown>('vip_plans', DEFAULT_PLANS));
  } catch {
    return DEFAULT_PLANS;
  }
}

export function getMpSettings(): MpSettings {
  return {
    enabled: get('mp_enabled') === 'on',
    accessToken: get('mp_access_token'),
    publicKey: get('mp_public_key'),
    webhookSecret: get('mp_webhook_secret'),
    sandbox: get('mp_sandbox') !== 'off',
    statementDescriptor: get('mp_statement_descriptor') || 'MUCURA VIP',
  };
}

/** Whether the logged-in panel's map changer is limited to active VIP accounts. */
export function userPanelVipOnly(): boolean {
  return get('user_panel_vip_only') !== 'off';
}

export function publicSite(): Record<string, unknown> {
  const social = getJson<SocialLinks>('social', {
    discord: '',
    instagram: '',
    youtube: '',
    facebook: '',
    tiktok: '',
    whatsapp: '',
  });
  const mp = getMpSettings();
  return {
    site: {
      name: get('site_name'),
      tagline: get('site_tagline'),
      eyebrow: get('hero_eyebrow'),
      title: get('hero_title'),
      subtitle: get('hero_subtitle'),
      text: get('hero_text'),
    },
    vip: {
      notice: get('vip_notice'),
      support_email: get('support_email'),
    },
    server: {
      name: get('server_name'),
      description: get('server_description'),
      version: get('server_version'),
      language: get('server_language'),
      rates: {
        exp: get('rate_exp'),
        drop: get('rate_drop'),
        master: get('rate_master'),
      },
      facts: getJson<ServerFact[]>('server_info', []),
      events: getJson<EventItem[]>('events', []),
      rules: getJson<string[]>('rules', []),
    },
    faq: getJson<FaqItem[]>('faq', []),
    links: getJson<LinkItem[]>('links', []),
    social,
    urls: {
      play: CLIENT_URL,
      register: REGISTER_URL,
    },
    plans: getPlans(),
    payments: {
      enabled: mp.enabled,
      configured: Boolean(mp.accessToken),
      sandbox: mp.sandbox,
    },
    player_panel: {
      vip_only: userPanelVipOnly(),
    },
  };
}

function asRecord(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${name} inválido.`);
  }
  return value as Record<string, unknown>;
}

function arrayField(value: unknown, name: string, max: number): unknown[] {
  if (!Array.isArray(value)) throw new HttpError(400, `${name} deve ser uma lista.`);
  if (value.length > max) throw new HttpError(400, `${name} tem itens demais.`);
  return value;
}

function textOr(value: unknown, name: string, max: number): string {
  return optionalString(value, name, max);
}

/** Useful links may point at an anchor, a site page, or the two installer-provided origins. */
function safeLinkUrl(value: unknown, name: string): string {
  const raw = optionalString(value, name, 500);
  if (!raw) return '';
  if (
    raw === '@register' ||
    raw === '@play' ||
    (raw.startsWith('/') && !raw.startsWith('//')) ||
    raw.startsWith('#')
  ) {
    return raw;
  }
  return safeHttpUrl(raw, name);
}

export type AdminSettings = {
  site: { name: string; tagline: string; eyebrow: string; title: string; subtitle: string; text: string };
  vip: { notice: string; support_email: string };
  server: {
    name: string;
    description: string;
    version: string;
    language: string;
    rate_exp: string;
    rate_drop: string;
    rate_master: string;
    facts: ServerFact[];
    events: EventItem[];
    rules: string[];
  };
  faq: FaqItem[];
  links: LinkItem[];
  social: SocialLinks;
  vip_plans: VipPlan[];
  player_panel: {
    vip_only: boolean;
  };
  mercadopago: {
    enabled: boolean;
    access_token_set: boolean;
    access_token_hint: string;
    public_key: string;
    webhook_secret_set: boolean;
    sandbox: boolean;
    statement_descriptor: string;
  };
};

function mask(value: string): string {
  if (!value) return '';
  if (value.length <= 10) return '••••••••';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function adminSettings(): AdminSettings {
  const mp = getMpSettings();
  return {
    site: {
      name: get('site_name'),
      tagline: get('site_tagline'),
      eyebrow: get('hero_eyebrow'),
      title: get('hero_title'),
      subtitle: get('hero_subtitle'),
      text: get('hero_text'),
    },
    vip: {
      notice: get('vip_notice'),
      support_email: get('support_email'),
    },
    server: {
      name: get('server_name'),
      description: get('server_description'),
      version: get('server_version'),
      language: get('server_language'),
      rate_exp: get('rate_exp'),
      rate_drop: get('rate_drop'),
      rate_master: get('rate_master'),
      facts: getJson<ServerFact[]>('server_info', []),
      events: getJson<EventItem[]>('events', []),
      rules: getJson<string[]>('rules', []),
    },
    faq: getJson<FaqItem[]>('faq', []),
    links: getJson<LinkItem[]>('links', []),
    social: getJson<SocialLinks>('social', {
      discord: '',
      instagram: '',
      youtube: '',
      facebook: '',
      tiktok: '',
      whatsapp: '',
    }),
    vip_plans: getPlans(),
    player_panel: {
      vip_only: userPanelVipOnly(),
    },
    mercadopago: {
      enabled: mp.enabled,
      access_token_set: Boolean(mp.accessToken),
      access_token_hint: mask(mp.accessToken),
      public_key: mp.publicKey,
      webhook_secret_set: Boolean(mp.webhookSecret),
      sandbox: mp.sandbox,
      statement_descriptor: mp.statementDescriptor,
    },
  };
}

export function saveAdminSettings(body: unknown): AdminSettings {
  const root = asRecord(body, 'Configurações');
  const site = asRecord(root.site, 'Site');
  const server = asRecord(root.server, 'Servidor');
  const mp = asRecord(root.mercadopago, 'Mercado Pago');
  const playerPanel = root.player_panel === undefined ? {} : asRecord(root.player_panel, 'Painel do jogador');

  setSetting('site_name', stringField(site.name, 'Nome do site', 60));
  setSetting('site_tagline', textOr(site.tagline, 'Slogan', 120));
  setSetting('hero_eyebrow', textOr(site.eyebrow, 'Chamada do topo', 80));
  setSetting('hero_title', stringField(site.title, 'Título principal', 100));
  setSetting('hero_subtitle', textOr(site.subtitle, 'Subtítulo', 180));
  setSetting('hero_text', textOr(site.text, 'Texto de apresentação', 600));

  const vip = asRecord(root.vip, 'VIP');
  setSetting('vip_notice', textOr(vip.notice, 'Texto do VIP', 300));
  setSetting('support_email', textOr(vip.support_email, 'E-mail de suporte', 160));

  setSetting('server_name', stringField(server.name, 'Nome do servidor', 60));
  setSetting('server_description', textOr(server.description, 'Descrição do servidor', 300));
  setSetting('server_version', textOr(server.version, 'Versão', 40));
  setSetting('server_language', textOr(server.language, 'Idioma', 20));
  setSetting('rate_exp', textOr(server.rate_exp, 'Taxa de EXP', 20));
  setSetting('rate_drop', textOr(server.rate_drop, 'Taxa de drop', 20));
  setSetting('rate_master', textOr(server.rate_master, 'Taxa de Master EXP', 20));

  const facts = arrayField(server.facts, 'Informações do servidor', 20).map((item, index) => {
    const row = asRecord(item, `Informação ${index + 1}`);
    return {
      label: stringField(row.label, `Rótulo ${index + 1}`, 40),
      value: textOr(row.value, `Valor ${index + 1}`, 80),
    };
  });
  setSetting('server_info', JSON.stringify(facts));

  const events = arrayField(server.events, 'Eventos', 30).map((item, index) => {
    const row = asRecord(item, `Evento ${index + 1}`);
    return {
      title: stringField(row.title, `Título do evento ${index + 1}`, 80),
      schedule: textOr(row.schedule, `Horário do evento ${index + 1}`, 80),
      description: textOr(row.description, `Descrição do evento ${index + 1}`, 300),
    };
  });
  setSetting('events', JSON.stringify(events));

  const rules = arrayField(server.rules, 'Regras', 40)
    .map((item, index) => textOr(item, `Regra ${index + 1}`, 400))
    .filter(Boolean);
  setSetting('rules', JSON.stringify(rules));

  const faq = arrayField(root.faq, 'Perguntas frequentes', 40).map((item, index) => {
    const row = asRecord(item, `Pergunta ${index + 1}`);
    return {
      question: stringField(row.question, `Pergunta ${index + 1}`, 160),
      answer: stringField(row.answer, `Resposta ${index + 1}`, 800),
    };
  });
  setSetting('faq', JSON.stringify(faq));

  const links = arrayField(root.links, 'Links úteis', 30).map((item, index) => {
    const row = asRecord(item, `Link ${index + 1}`);
    return {
      label: stringField(row.label, `Nome do link ${index + 1}`, 60),
      url: safeLinkUrl(row.url, `URL do link ${index + 1}`),
      description: textOr(row.description, `Descrição do link ${index + 1}`, 160),
    };
  });
  setSetting('links', JSON.stringify(links));

  const social = asRecord(root.social, 'Redes sociais');
  const socialOut: SocialLinks = {
    discord: safeHttpUrl(social.discord, 'Discord'),
    instagram: safeHttpUrl(social.instagram, 'Instagram'),
    youtube: safeHttpUrl(social.youtube, 'YouTube'),
    facebook: safeHttpUrl(social.facebook, 'Facebook'),
    tiktok: safeHttpUrl(social.tiktok, 'TikTok'),
    whatsapp: safeHttpUrl(social.whatsapp, 'WhatsApp'),
  };
  setSetting('social', JSON.stringify(socialOut));

  const plans = parsePlans(root.vip_plans);
  setSetting('vip_plans', JSON.stringify(plans));
  // The game applies the same numbers the site shows: one row per plan, written on every save.
  syncGamePlans(plans);

  setSetting('user_panel_vip_only', booleanField(playerPanel.vip_only, true) ? 'on' : 'off');

  setSetting('mp_enabled', booleanField(mp.enabled) ? 'on' : 'off');
  const accessToken = optionalString(mp.access_token, 'Access token', 500);
  if (accessToken) setSetting('mp_access_token', accessToken);
  setSetting('mp_public_key', optionalString(mp.public_key, 'Public key', 500));
  const webhookSecret = optionalString(mp.webhook_secret, 'Webhook secret', 500);
  if (webhookSecret) setSetting('mp_webhook_secret', webhookSecret);
  setSetting('mp_sandbox', booleanField(mp.sandbox, true) ? 'on' : 'off');
  setSetting(
    'mp_statement_descriptor',
    textOr(mp.statement_descriptor, 'Nome na fatura', 22) || 'MUCURA VIP'
  );

  return adminSettings();
}

/** Only used by the admin dashboard. */
export function settingsCount(): number {
  return getJson<unknown[]>('vip_plans', []).length;
}

export { numberField };
