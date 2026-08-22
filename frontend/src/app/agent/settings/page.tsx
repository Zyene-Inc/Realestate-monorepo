import { AgentSettings } from "@/components/agent/agent-settings";
import { PageHeader } from "@/components/portal/page-header";

export default function AgentSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Agent company" title="Profile and documents" description="Maintain the contact details and private verification files used to review and support your company." />
      <AgentSettings />
    </div>
  );
}
