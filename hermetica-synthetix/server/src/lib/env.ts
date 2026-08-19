import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    // Don't crash at import time in dev; routes that need the value will
    // fail loudly with a clear error instead of the whole server refusing to boot.
    return '';
  }
  return v;
}

export const env = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: required('DATABASE_URL'),
  JWT_SECRET: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // Integrations (all optional at boot; each shim checks its own key and
  // throws a descriptive error only when actually invoked without config)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  IMAGE_GEN_API_KEY: process.env.IMAGE_GEN_API_KEY || process.env.OPENAI_API_KEY || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'no-reply@localhost',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',

  STORAGE_DRIVER: (process.env.STORAGE_DRIVER as 'local' | 's3') || 'local',
  STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR || './uploads',
  STORAGE_PUBLIC_BASE_URL: process.env.STORAGE_PUBLIC_BASE_URL || '/uploads',
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_REGION: process.env.S3_REGION || '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',

  WEB_ORIGIN: process.env.WEB_ORIGIN || '*',
};
