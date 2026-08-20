import { AgentPortalShell } from "@/components/agent/agent-portal-shell";

export default function AgentInquiriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AgentPortalShell>{children}</AgentPortalShell>;
}
