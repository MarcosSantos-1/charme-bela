-- ============================================
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE
-- ============================================

-- Usuários: busca por email e firebaseUid é muito comum
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_firebaseUid_idx" ON "User"("firebaseUid");
CREATE INDEX IF NOT EXISTS "User_role_isActive_idx" ON "User"("role", "isActive");

-- Agendamentos: queries por data, status e usuário
CREATE INDEX IF NOT EXISTS "Appointment_date_idx" ON "Appointment"("date");
CREATE INDEX IF NOT EXISTS "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX IF NOT EXISTS "Appointment_userId_date_idx" ON "Appointment"("userId", "date");
CREATE INDEX IF NOT EXISTS "Appointment_serviceId_date_idx" ON "Appointment"("serviceId", "date");

-- Assinaturas: busca por usuário e status
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription"("userId", "status");
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");

-- Vouchers: busca por usuário e status de uso
CREATE INDEX IF NOT EXISTS "Voucher_userId_isUsed_idx" ON "Voucher"("userId", "isUsed");
CREATE INDEX IF NOT EXISTS "Voucher_expiresAt_idx" ON "Voucher"("expiresAt");

-- Notificações: ordenação e filtro por data/status
CREATE INDEX IF NOT EXISTS "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt" DESC);

-- Anamneses: busca por usuário
CREATE INDEX IF NOT EXISTS "Anamnesis_userId_idx" ON "Anamnesis"("userId");

