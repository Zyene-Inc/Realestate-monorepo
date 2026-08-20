import { AgentPortalShell } from "@/components/agent/agent-portal-shell";

export default function AgentSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentPortalShell>{children}</AgentPortalShell>;
}
