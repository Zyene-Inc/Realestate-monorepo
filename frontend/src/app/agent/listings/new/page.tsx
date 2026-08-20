import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SaleListingForm } from "@/components/agent/sale-listing-form";

export default function NewSaleListingPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/agent/listings"
        className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to listings
      </Link>
      <SaleListingForm />
    </div>
  );
}
