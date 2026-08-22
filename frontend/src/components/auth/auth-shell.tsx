import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { PropertySlideshow, type PropertySlide } from "@/components/public/property-slideshow";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const authSlides: PropertySlide[] = [
  {
    src: "/images/coach-johnson/missouri-brick-rental.webp",
    alt: "Restored brick Missouri rental building framed by mature trees",
    caption: "Property care rooted in Missouri",
  },
  {
    src: "/images/coach-johnson/missouri-home-interior.webp",
    alt: "Comfortable Missouri home interior with restored woodwork",
    caption: "Clear service starts at home",
  },
  {
    src: "/images/coach-johnson/missouri-neighborhood.webp",
    alt: "Tree-lined Missouri neighborhood with established homes",
    caption: "Local knowledge, dependable follow-through",
  },
];

export function AuthShell({ children, eyebrow, title, description, wide = false }: { children: React.ReactNode; eyebrow: string; title: string; description: string; wide?: boolean }) {
  return (
    <main id="main-content" className="grid min-h-[100dvh] bg-background lg:grid-cols-[minmax(0,1.08fr)_minmax(28rem,.92fr)]">
      <aside className="hidden min-h-[100dvh] overflow-hidden bg-brand text-white lg:flex lg:flex-col">
        <PropertySlideshow
          slides={authSlides}
          preload
          tone="brand"
          sizes="55vw"
          className="flex min-h-0 flex-1 flex-col"
          imageClassName="min-h-0 flex-1"
          label="Coach Johnson Realty Missouri homes"
        />
        <div className="border-t border-white/12 p-10 xl:p-14">
          <p className="max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em]">A clear path home, and a capable team behind every detail.</p>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/72">Secure access for residents, approved agent companies, and Coach Johnson Realty staff.</p>
        </div>
      </aside>
      <section className="flex min-h-[100dvh] flex-col px-5 py-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between">
          <Link href="/" transitionTypes={["nav-back"]} className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/25"><ArrowLeft className="size-4" aria-hidden="true" />Website</Link>
          <ThemeToggle />
        </div>
        <div className={cn("mx-auto flex w-full flex-1 flex-col justify-center py-10", wide ? "max-w-2xl" : "max-w-md")}>
          <Logo className="mb-10 h-10 text-foreground" />
          <p className="text-sm font-semibold text-primary">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
