import { PortalLoginForm } from "@/components/auth/portal-login-form";

export default function AgentLoginPage() {
  return (
    <PortalLoginForm
      eyebrow="Agent company workspace"
      title="Continue to your listings"
      description="Review submissions, follow property decisions, and respond to interested buyers from one secure workspace."
      forgotTestId="agent-forgot-password"
      invitationCopy="New agent company?"
      invitationHref="/agent/signup"
      invitationLabel="Apply for approval."
      portal="agent"
    />
  );
}
