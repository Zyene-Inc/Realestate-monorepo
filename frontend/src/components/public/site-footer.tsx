import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card py-10 sm:py-14">
      <div className="public-container grid gap-10 md:grid-cols-[1.4fr_1fr_1fr] md:items-start">
        <div className="max-w-md">
          <Logo className="h-10 text-foreground" />
          <p className="mt-5 text-sm leading-6 text-muted-foreground">Thoughtful homes and clear property management for Kansas City residents, owners, and agents.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Explore</p>
          <nav className="mt-4 grid gap-3 text-sm text-muted-foreground" aria-label="Footer navigation">
            <Link className="hover:text-foreground" href="/properties">Properties</Link>
            <Link className="hover:text-foreground" href="/about">Our approach</Link>
            <Link className="hover:text-foreground" href="/contact">Contact</Link>
          </nav>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Need help?</p>
          <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/75" href="mailto:info@coachjohnsonrealty.com">info@coachjohnsonrealty.com<ArrowUpRight className="size-4" aria-hidden="true" /></a>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">© 2026 Coach Johnson Realty Group. Fair housing and accessibility are part of how we work.</p>
        </div>
      </div>
    </footer>
  );
}
