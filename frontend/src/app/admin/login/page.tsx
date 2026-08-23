import { PortalLoginForm } from "@/components/auth/portal-login-form";

export default function AdminLogin() {
  return (
    <PortalLoginForm
      eyebrow="Property operations"
      title="Administration sign in"
      description="Review the portfolio, resident service, payments, and field work from one protected workspace."
      forgotTestId="admin-forgot-password"
      invitationCopy="Access is limited to authorized Coach Johnson Realty staff. Account activity is monitored for property and resident security."
      portal="admin"
    />
  );
}
