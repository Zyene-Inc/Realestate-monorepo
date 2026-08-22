import { PortalLoginForm } from "@/components/auth/portal-login-form";

export default function TenantLogin() {
  return <PortalLoginForm eyebrow="Resident portal" title="Your home, organized" description="See your lease, balance, documents, maintenance requests, and messages in one secure place." forgotTestId="tenant-forgot-password" invitationCopy="Resident accounts are created by Coach Johnson Realty. Use the secure invitation sent to your email to finish account setup." />;
}
