import { TZDate } from '@date-fns/tz';

export function getBaseUrl(): string {
  let baseUrl: string;

  if (process?.env?.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim() !== '') {
    baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  } else if (process?.env?.NEXT_PUBLIC_VERCEL_URL && process.env.NEXT_PUBLIC_VERCEL_URL.trim() !== '') {
    // NEXT_PUBLIC_VERCEL_URL doesn't include protocol
    baseUrl = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  } else {
    baseUrl = 'http://localhost:3000';
  }

  if (!baseUrl.endsWith('/')) {
    baseUrl += '/';
  }

  return baseUrl;
}

export function getCurrentDate() {
  const now = new TZDate(new Date(), 'Europe/Copenhagen');
  return now;
}
