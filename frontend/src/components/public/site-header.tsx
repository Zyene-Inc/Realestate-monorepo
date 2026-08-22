"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/properties", label: "Properties" },
  { href: "/about", label: "Our approach" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 py-3 backdrop-blur-xl" style={{ viewTransitionName: "persistent-nav" }}>
      <div className="public-container flex min-h-12 items-center justify-between gap-4">
        <Link href="/" aria-label="Coach Johnson Realty home" onClick={() => setOpen(false)}>
          <Logo className="h-9 text-foreground sm:h-10" />
        </Link>
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} className={cn("rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25", pathname === item.href && "bg-secondary text-foreground")}>{item.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button nativeButton={false} className="hidden sm:inline-flex" render={<Link href="/#portal-access" />}>Portal sign in</Button>
          <Button type="button" variant="outline" size="icon" className="lg:hidden" aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen((value) => !value)}>
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" aria-label="Mobile navigation" className="public-container mt-3 grid gap-1 border-t border-border pt-3 pb-2 lg:hidden">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn("flex min-h-12 items-center rounded-xl px-4 text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25", pathname === item.href && "bg-secondary text-foreground")}>{item.label}</Link>
          ))}
          <Button nativeButton={false} className="mt-2 w-full" render={<Link href="/#portal-access" onClick={() => setOpen(false)} />}>Portal sign in</Button>
        </nav>
      )}
    </header>
  );
}
