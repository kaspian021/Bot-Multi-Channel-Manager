// ==============================================================
// SSRF Safe URL Fetcher & Security Guard — Section 47 Specification
// ==============================================================

import { URL } from 'url';

export class SecuritySSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecuritySSRFError';
  }
}

/**
 * Validates a target URL against SSRF vulnerabilities before fetching.
 */
export function validateUrlSafety(targetUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SecuritySSRFError(`Invalid URL format: ${targetUrl}`);
  }

  // 1. Protocol check: HTTP / HTTPS only
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SecuritySSRFError(`Unsupported protocol '${parsed.protocol}'. Only HTTP/HTTPS allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block localhost and loopbacks
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local')
  ) {
    throw new SecuritySSRFError(`Access to localhost / loopback addresses is forbidden.`);
  }

  // 3. Block AWS/GCP/Azure Cloud Metadata IP
  if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
    throw new SecuritySSRFError(`Access to cloud instance metadata service is forbidden.`);
  }

  // 4. Block Private IPv4 address ranges (RFC 1918)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);

    // 10.0.0.0 - 10.255.255.255
    if (octet1 === 10) {
      throw new SecuritySSRFError(`Access to private IP range 10.0.0.0/8 is forbidden.`);
    }

    // 172.16.0.0 - 172.31.255.255
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
      throw new SecuritySSRFError(`Access to private IP range 172.16.0.0/12 is forbidden.`);
    }

    // 192.168.0.0 - 192.168.255.255
    if (octet1 === 192 && octet2 === 168) {
      throw new SecuritySSRFError(`Access to private IP range 192.168.0.0/16 is forbidden.`);
    }
  }
}

/**
 * Safe fetch wrapper that enforces SSRF safety, timeout, and response size limits.
 */
export async function safeFetchUrl(
  url: string,
  options: { timeoutMs?: number; maxSizeBytes?: number } = {}
): Promise<string> {
  validateUrlSafety(url);

  const timeoutMs = options.timeoutMs || 8000;
  const maxSizeBytes = options.maxSizeBytes || 2 * 1024 * 1024; // 2MB limit

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FutureStackBot-Research/1.0 (+https://futurestack.ai)',
        Accept: 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }

    const contentLength = res.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new Error(`Response size exceeds limit of ${maxSizeBytes} bytes`);
    }

    const text = await res.text();
    if (text.length > maxSizeBytes) {
      return text.substring(0, maxSizeBytes);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}
