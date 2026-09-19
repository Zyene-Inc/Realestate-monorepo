import { SignaturePortalPage } from "@/components/signatures/signature-portal-page";
import { TenantDocumentManager } from "@/components/portal/tenant-document-manager";

export default function TenantDocumentsPage() {
  return (
    <div className="space-y-12">
      <TenantDocumentManager />
      <SignaturePortalPage portal="tenant" />
    </div>
  );
}
