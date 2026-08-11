const PRODUCTION_AUTO_MAILER_URL = 'https://auto-mailer-blue.vercel.app';

const trimSlash = (url) => String(url || '').trim().replace(/\/$/, '');

/** Local / private hosts must never ship in production builds (bad VITE_AUTO_MAILER_URL). */
export function isLocalAutoMailerOrigin(url) {
  const raw = trimSlash(url);
  if (!raw) return false;
  try {
    const { hostname } = new URL(raw.includes('://') ? raw : `http://${raw}`);
    const host = hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host.endsWith('.local')) return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    return false;
  } catch {
    return /localhost|127\.0\.0\.1/i.test(raw);
  }
}

export function getAutoMailerOrigin() {
  // ponytail: prod UI by default; set VITE_AUTO_MAILER_URL for local Auto-Mailer (DEV only)
  const fromEnv = trimSlash(import.meta.env.VITE_AUTO_MAILER_URL);
  if (fromEnv) {
    if (import.meta.env.PROD && isLocalAutoMailerOrigin(fromEnv)) {
      return PRODUCTION_AUTO_MAILER_URL;
    }
    return fromEnv;
  }
  return PRODUCTION_AUTO_MAILER_URL;
}

export function autoMailerPathForCoreKnotPath(pathname = '') {
  const path = String(pathname || '').split('?')[0];
  const withoutOrg = path.replace(/^\/[^/]+(?=\/emails(?:\/|$))/, '');

  const withoutOrgCampaign = path.replace(/^\/[^/]+(?=\/campaign\/)/, '');

  if (/^\/campaign\/([^/]+)/.test(withoutOrgCampaign)) {
    const [, id] = withoutOrgCampaign.match(/^\/campaign\/([^/]+)/) || [];
    return id ? `/campaigns/${encodeURIComponent(id)}` : '/campaigns';
  }
  if (/^\/emails\/create\b/.test(withoutOrg)) return '/campaigns/new';
  if (/^\/emails\/campaigns\b/.test(withoutOrg)) return '/campaigns';
  if (/^\/emails\/templates\b/.test(withoutOrg)) return '/templates';
  if (/^\/emails\/profiles\b/.test(withoutOrg)) return '/senders';
  if (/^\/emails\/streams\b/.test(withoutOrg)) return '/settings';
  if (/^\/emails\/newsletter\/send\b/.test(withoutOrg)) return '/campaigns/new';
  if (/^\/emails\/newsletter\b/.test(withoutOrg)) return '/campaigns';
  if (/^\/data-hub\b/.test(path) || /^\/admin\/data-hub\b/.test(path)) return '/audience';
  if (/^\/unsubscribe\b/.test(path)) return '/unsubscribe';
  return '';
}

export function buildAutoMailerUrl(pathname = '') {
  const origin = getAutoMailerOrigin();
  const path = autoMailerPathForCoreKnotPath(pathname);
  const query = String(pathname || '').includes('?') ? `?${String(pathname).split('?').slice(1).join('?')}` : '';
  if (path === '/unsubscribe') return `${origin}${path}${query}`;
  return `${origin}${path}`;
}
