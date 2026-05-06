/**
 * Input Validation Middleware
 * Sanitizes and validates all user inputs
 */

export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export function validatePassword(password) {
  const minLength = parseInt(process.env.PASSWORD_MIN_LENGTH || 8);
  // Require: min length, at least one number, one uppercase, one lowercase
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\w\W]{8,}$/;
  
  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` };
  }
  if (!passwordRegex.test(password)) {
    return { valid: false, error: 'Password must contain uppercase, lowercase, and numbers' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password too long' };
  }
  return { valid: true };
}

export function validateDisplayName(name) {
  if (!name || typeof name !== 'string') {
    return true;
  } // optional
  if (name.length > 100) {
    return false;
  }
  // Prevent script injection
  if (/<|>|"'`/g.test(name)) {
    return false;
  }
  return true;
}

export function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function validateBookId(id) {
  return validateUUID(id);
}

export function validateChapterIndex(index) {
  const num = parseInt(index, 10);
  return Number.isInteger(num) && num >= 0 && num < 10000;
}

/**
 * Middleware to validate request body
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const errors = {};

    for (const [field, validator] of Object.entries(schema)) {
      const value = req.body[field];
      const result = validator(value);
      
      if (result === false) {
        errors[field] = `Invalid ${field}`;
      } else if (result.valid === false) {
        errors[field] = result.error;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}

/**
 * Sanitize object for logging (remove sensitive fields)
 */
export function sanitizeForLogging(obj) {
  if (!obj) {
    return obj;
  }
  const sanitized = { ...obj };
  const sensitiveFields = ['password', 'password_hash', 'token', 'api_key'];
  
  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}
