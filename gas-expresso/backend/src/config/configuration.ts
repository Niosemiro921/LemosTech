export default () => ({
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
});
