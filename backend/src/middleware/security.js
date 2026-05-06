/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */

export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Feature policy / Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (only in HTTPS)
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_HTTPS_REDIRECT === 'true') {
    res.setHeader('Strict-Transport-Security', `max-age=${process.env.HSTS_MAX_AGE || 31536000}; includeSubDomains`);
  }
  
  // CSP - prevent inline scripts (basic policy)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://openrouter.ai"
  );
  
  next();
}

/**
 * HTTPS Redirect Middleware
 */
export function httpsRedirect(req, res, next) {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_HTTPS_REDIRECT === 'true') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
  }
  next();
}
