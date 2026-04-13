import { Elysia } from 'elysia';

export const securityHeaders = new Elysia({
  name: 'securityHeaders',
}).onAfterHandle(({ set }) => {
  // Content-Security-Policy: Sensible defaults for a modern SPA
  set.headers['Content-Security-Policy'] =
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " + // unsafe-inline/eval often needed for dev/some frameworks
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data: https:; " +
    "connect-src 'self' https: http:; " + // Allow connecting to APIs
    "media-src 'self' https: http: blob:; " +
    "object-src 'none'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';";

  // Strict-Transport-Security (HSTS): 1 year
  set.headers['Strict-Transport-Security'] =
    'max-age=31536000; includeSubDomains; preload';

  // X-Frame-Options: Prevent Clickjacking
  set.headers['X-Frame-Options'] = 'DENY';

  // X-Content-Type-Options: Prevent MIME-sniffing
  set.headers['X-Content-Type-Options'] = 'nosniff';

  // Referrer-Policy: Control referrer information
  set.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';

  // Permissions-Policy: Disable unused features
  set.headers['Permissions-Policy'] =
    'camera=(), microphone=(), geolocation=(), payment=()';
});
