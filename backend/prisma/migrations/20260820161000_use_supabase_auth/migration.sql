-- Supabase Auth owns credentials, password resets, and sessions. The application
-- keeps its existing User table for roles and business-domain relations.
ALTER TABLE "User" ADD COLUMN "authUserId" UUID;
UPDATE "User" SET "authUserId" = gen_random_uuid() WHERE "authUserId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "authUserId" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "password";
ALTER TABLE "User" DROP COLUMN "inviteToken";
ALTER TABLE "User" DROP COLUMN "inviteTokenExpires";
ALTER TABLE "User" DROP COLUMN "resetToken";
ALTER TABLE "User" DROP COLUMN "resetTokenExpires";
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");

-- The Nest API is the only data access path. RLS provides a safe default should
-- a table later be exposed through the Supabase Data API.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PropertyOwner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Property" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Unit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lease" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutoPay" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MaintenanceRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Announcement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
