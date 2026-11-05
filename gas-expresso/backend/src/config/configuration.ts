const PLACEHOLDER_SECRETS = new Set([
  'dev-only-secret',
  'SUBSTITUIR_POR_UM_SEGREDO_ALEATORIO',
  'SUBSTITUIR_POR_SEGREDO_ALEATORIO_LONGO',
  'change_me',
]);

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET não está configurado. Defina um segredo aleatório antes de arrancar o serviço.');
  }

  if (process.env.NODE_ENV === 'production') {
    if (PLACEHOLDER_SECRETS.has(secret) || secret.length < 32) {
      throw new Error('JWT_SECRET inseguro: em produção deve ter pelo menos 32 caracteres e não pode ser um placeholder.');
    }
  } else if (PLACEHOLDER_SECRETS.has(secret)) {
    console.warn('[security] JWT_SECRET está a usar um valor placeholder. Defina um segredo aleatório antes de produção.');
  }

  return secret;
}

export default () => ({
  port: Number(process.env.PORT ?? 5048),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE ?? 'false',
  smtpStartTls: process.env.SMTP_STARTTLS ?? 'false',
  smtpEhlo: process.env.SMTP_EHLO ?? 'gas-expresso',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? '',
  mediaStoragePath: process.env.MEDIA_STORAGE_PATH ?? '',
  mediaPublicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL ?? '/uploads',
});
