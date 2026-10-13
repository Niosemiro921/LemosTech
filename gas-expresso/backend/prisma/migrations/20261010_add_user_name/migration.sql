-- Nome de utilizador próprio (ex.: administradores, que não têm perfil associado).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
