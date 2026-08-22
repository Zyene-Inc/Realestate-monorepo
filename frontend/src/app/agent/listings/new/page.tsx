import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SaleListingForm } from "@/components/agent/sale-listing-form";
import { DirectionalPage } from "@/components/page-transition";

export default function NewSaleListingPage() {
  return (
    <DirectionalPage><div className="space-y-6">
      <Link
        href="/agent/listings"
        transitionTypes={["nav-back"]}
        className="inline-flex min-h-11 items-center rounded-full text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to listings
      </Link>
      <SaleListingForm />
    </div></DirectionalPage>
  );
}
