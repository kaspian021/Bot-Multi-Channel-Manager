// ==============================================================
// Production URL Fetcher — Section 13 Specification
// Enforces SSRF, HTTP/HTTPS only, redirects, limits, timeouts
// ==============================================================

import { ISourceFetcher } from '../../application/interfaces/production-interfaces';
import { validateUrlSafety } from '../security/ssrf-filter';

export function normalizeCanonicalUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    // Strip standard tracking query params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    const port = (parsed.port === '80' && parsed.protocol === 'http:') || (parsed.port === '443' && parsed.protocol === 'https:') ? '' : (parsed.port ? `:${parsed.port}` : '');
    const search = parsed.searchParams.toString() ? `?${parsed.searchParams.toString()}` : '';
    return `${parsed.protocol.toLowerCase()}//${parsed.hostname.toLowerCase()}${port}${path}${search}`;
  } catch {
    return rawUrl;
  }
}

export class ProductionUrlFetcher implements ISourceFetcher {
  private readonly defaultTimeoutMs: number;
  private readonly defaultMaxBytes: number;
  private readonly maxRedirects: number;

  constructor(timeoutMs = 10000, maxBytes = 5 * 1024 * 1024, maxRedirects = 5) {
    this.defaultTimeoutMs = timeoutMs;
    this.defaultMaxBytes = maxBytes;
    this.maxRedirects = maxRedirects;
  }

  normalizeCanonicalUrl(url: string): string {
    return normalizeCanonicalUrl(url);
  }

  async fetchUrl(
    url: string,
    options: { timeoutMs?: number; maxSizeBytes?: number; maxRedirects?: number } = {}
  ): Promise<{
    success: boolean;
    content?: string;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const res = await this.fetch(url, {
        timeoutMs: options.timeoutMs,
        maxBytes: options.maxSizeBytes,
      });
      return {
        success: true,
        content: res.content,
        statusCode: res.statusCode,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 500,
        error: err?.message || 'Fetch failed',
      };
    }
  }

  async fetch(
    url: string,
    options: { timeoutMs?: number; maxBytes?: number } = {}
  ): Promise<{
    url: string;
    canonicalUrl?: string;
    contentType: string;
    content: string;
    statusCode: number;
    headers: Record<string, string>;
  }> {
    let currentUrl = url;
    let redirectCount = 0;
    const timeoutMs = options.timeoutMs || this.defaultTimeoutMs;
    const maxBytes = options.maxBytes || this.defaultMaxBytes;

    while (redirectCount <= this.maxRedirects) {
      validateUrlSafety(currentUrl);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual', // handle manual redirects to validate SSRF on each hop
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FutureStackBot/2.0; +https://futurestack.ai/bot)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,application/json;q=0.5,*/*;q=0.1',
          },
        });

        // Handle redirects safely
        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get('location');
          if (!location) {
            throw new Error(`Redirect response ${res.status} missing Location header`);
          }

          redirectCount++;
          if (redirectCount > this.maxRedirects) {
            throw new Error(`Exceeded maximum redirect limit of ${this.maxRedirects}`);
          }

          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }

        const headers: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });

        const contentType = headers['content-type'] || 'text/html';

        if (!res.ok) {
          throw new Error(`HTTP fetch failed with status ${res.status}: ${res.statusText}`);
        }

        const contentLengthHeader = headers['content-length'];
        if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxBytes) {
          throw new Error(`Content length ${contentLengthHeader} bytes exceeds maximum allowed limit of ${maxBytes} bytes`);
        }

        let content = await res.text();
        if (content.length > maxBytes) {
          content = content.substring(0, maxBytes);
        }

        return {
          url: currentUrl,
          contentType,
          content,
          statusCode: res.status,
          headers,
        };
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error(`Exceeded maximum redirect limit of ${this.maxRedirects}`);
  }
}
