import { AgentSettings } from "@/components/agent/agent-settings";

export default function AgentSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Agent company
        </p>
        <h1 className="mt-2 text-4xl font-bold font-heading">
          Profile and documents
        </h1>
        <p className="mt-2 text-muted-foreground">
          Maintain the contact details and private verification files Johnson
          Realty uses for your account.
        </p>
      </div>
      <AgentSettings />
    </div>
  );
}
