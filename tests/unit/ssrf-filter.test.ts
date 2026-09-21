import { describe, it, expect } from 'vitest';
import { validateUrlSafety, SecuritySSRFError } from '../../src/infrastructure/security/ssrf-filter';

describe('SSRF Safety Filter (Section 47)', () => {
  it('allows safe public https URLs', () => {
    expect(() => validateUrlSafety('https://arxiv.org/abs/2401.0001')).not.toThrow();
    expect(() => validateUrlSafety('https://huggingface.co/blog')).not.toThrow();
  });

  it('blocks localhost and loopback targets', () => {
    expect(() => validateUrlSafety('http://localhost:3000/api')).toThrow(SecuritySSRFError);
    expect(() => validateUrlSafety('http://127.0.0.1:8080')).toThrow(SecuritySSRFError);
    expect(() => validateUrlSafety('http://0.0.0.0/')).toThrow(SecuritySSRFError);
  });

  it('blocks private IP ranges (RFC 1918)', () => {
    expect(() => validateUrlSafety('http://192.168.1.1/secret')).toThrow(SecuritySSRFError);
    expect(() => validateUrlSafety('http://10.0.0.5/admin')).toThrow(SecuritySSRFError);
    expect(() => validateUrlSafety('http://172.16.0.10/')).toThrow(SecuritySSRFError);
  });

  it('blocks cloud metadata IP (169.254.169.254)', () => {
    expect(() => validateUrlSafety('http://169.254.169.254/latest/meta-data')).toThrow(
      SecuritySSRFError
    );
  });

  it('rejects unsupported protocols (file, ftp, gopher)', () => {
    expect(() => validateUrlSafety('file:///etc/passwd')).toThrow(SecuritySSRFError);
    expect(() => validateUrlSafety('ftp://files.example.com')).toThrow(SecuritySSRFError);
  });
});
