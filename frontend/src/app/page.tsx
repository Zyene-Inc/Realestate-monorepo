import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  House,
  KeyRound,
  MapPin,
  MessageSquareText,
} from "lucide-react";
import {
  PropertySlideshow,
  type PropertySlide,
} from "@/components/public/property-slideshow";
import { HomeInventory } from "@/components/public/home-inventory";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";

const heroSlides: PropertySlide[] = [
  {
    src: "/images/coach-johnson/missouri-craftsman.webp",
    alt: "Brick-and-stone Craftsman home on a tree-lined Missouri street",
    caption: "Established homes across Missouri",
  },
  {
    src: "/images/coach-johnson/missouri-brick-rental.webp",
    alt: "Restored brick rental building with mature shade trees",
    caption: "Rental homes cared for with purpose",
  },
  {
    src: "/images/coach-johnson/missouri-neighborhood.webp",
    alt: "Missouri neighborhood with brick and clapboard homes",
    caption: "Local knowledge, block by block",
  },
];

const services = [
  {
    icon: House,
    title: "Buy a home",
    copy: "See the property clearly, understand the neighborhood, and move forward at your own pace.",
    href: "/properties",
    link: "Browse properties",
  },
  {
    icon: CircleDollarSign,
    title: "Sell with a plan",
    copy: "Position the home honestly, prepare it thoughtfully, and negotiate from a place of confidence.",
    href: "/contact",
    link: "Discuss your sale",
  },
  {
    icon: KeyRound,
    title: "Find a rental",
    copy: "Explore well-kept homes with clear terms and a responsive local management team.",
    href: "/rentals",
    link: "View available homes",
  },
  {
    icon: Building2,
    title: "Manage a property",
    copy: "Protect the investment while giving residents consistent service and straightforward communication.",
    href: "/contact",
    link: "Talk about management",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="public-container grid min-h-[calc(100dvh-4.5rem)] items-center gap-10 py-10 lg:grid-cols-[minmax(22rem,.9fr)_minmax(0,1.1fr)] lg:gap-14 lg:py-12">
          <div className="max-w-xl lg:py-8">
            <p className="text-sm font-semibold text-primary">
              Missouri real estate, close to home
            </p>
            <h1 className="mt-5 text-[clamp(3.4rem,5.4vw,5rem)] font-semibold leading-[.94] tracking-[-0.055em]">
              Missouri moves, handled well.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Coach Johnson Realty guides Missouri buyers, sellers, renters, and
              owners with clear advice and accountable service.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                nativeButton={false}
                size="lg"
                render={
                  <Link href="/properties" transitionTypes={["nav-forward"]} />
                }
              >
                Explore properties <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                nativeButton={false}
                size="lg"
                variant="outline"
                render={
                  <Link href="/contact" transitionTypes={["nav-forward"]} />
                }
              >
                Talk with our team
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {[
                ["Buy", "Guided search"],
                ["Sell", "Clear strategy"],
                ["Rent", "Responsive care"],
                ["Manage", "Local oversight"],
              ].map(([title, detail]) => (
                <div key={title}>
                  <p className="font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <PropertySlideshow
            slides={heroSlides}
            preload
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="rounded-[1.5rem] lift-shadow"
            imageClassName="min-h-[27rem] sm:min-h-[34rem] lg:min-h-[calc(100dvh-15rem)] lg:max-h-[42rem]"
            label="Featured Missouri homes"
          />
        </section>

        <HomeInventory />

        <section className="py-20 sm:py-28">
          <div className="public-container grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
            <article className="rounded-[1.5rem] border border-border bg-card p-7 sm:p-10 lg:p-14">
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                <CircleDollarSign
                  className="size-5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              <p className="mt-8 text-sm font-semibold text-primary">
                Thinking about selling?
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                Get your home sold with a sharper plan.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                Pricing, preparation, and positioning designed to protect your
                time and strengthen every offer conversation.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  nativeButton={false}
                  variant="outline"
                  render={
                    <Link
                      href="/contact?intent=sell"
                      transitionTypes={["nav-forward"]}
                    />
                  }
                >
                  Contact us <ArrowRight aria-hidden="true" />
                </Button>
                <Link
                  href="/about"
                  transitionTypes={["nav-forward"]}
                  className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-foreground hover:text-primary"
                >
                  Learn more{" "}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </article>

            <aside className="flex flex-col justify-between rounded-[1.5rem] border border-border bg-secondary p-7 sm:p-10 lg:p-12">
              <span className="flex size-12 items-center justify-center rounded-xl bg-card text-primary">
                <ChartNoAxesCombined
                  className="size-5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              <div className="mt-12">
                <h2 className="text-3xl font-semibold leading-tight tracking-[-0.04em]">
                  Curious about your local market?
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Request a focused snapshot of nearby listings, pricing
                  context, and current buyer activity.
                </p>
                <Button
                  nativeButton={false}
                  variant="outline"
                  className="mt-7"
                  render={
                    <Link
                      href="/contact?intent=market-report"
                      transitionTypes={["nav-forward"]}
                    />
                  }
                >
                  Get my report <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </aside>
          </div>
        </section>

        <section
          id="services"
          className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-28"
        >
          <div className="public-container grid gap-14 lg:grid-cols-[minmax(18rem,.68fr)_minmax(0,1.32fr)] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-semibold text-primary">
                One team, every property move
              </p>
              <h2 className="mt-4 max-w-lg text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                Real estate service that stays connected.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                Advice, representation, leasing, and management work better when
                the details live with people who know the property.
              </p>
            </div>

            <div className="grid border-t border-border">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article
                    key={service.title}
                    className="grid gap-5 border-b border-border py-8 sm:grid-cols-[3.25rem_minmax(10rem,.65fr)_minmax(0,1fr)] sm:items-start sm:gap-7"
                  >
                    <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon
                        className="size-5"
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    </span>
                    <h3 className="text-xl font-semibold tracking-[-0.025em]">
                      {service.title}
                    </h3>
                    <div>
                      <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                        {service.copy}
                      </p>
                      <Link
                        href={service.href}
                        transitionTypes={["nav-forward"]}
                        className="focus-ring mt-4 inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {service.link}{" "}
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28">
          <div className="public-container grid gap-6 lg:grid-cols-[1.18fr_.82fr] lg:grid-rows-[auto_auto]">
            <div className="relative min-h-[28rem] overflow-hidden rounded-[1.5rem] lg:row-span-2 lg:min-h-[44rem]">
              <Image
                src="/images/coach-johnson/missouri-home-interior.webp"
                alt="Welcoming Missouri living room with restored woodwork"
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="rounded-[1.5rem] border border-border bg-card p-7 sm:p-10 lg:p-12">
              <p className="text-sm font-semibold text-primary">
                Experience before the transaction
              </p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
                We look past the listing sheet.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted-foreground">
                A good decision includes the home, the block, the upkeep, the
                terms, and what happens after the keys change hands.
              </p>
              <Button
                nativeButton={false}
                variant="outline"
                className="mt-7"
                render={
                  <Link href="/about" transitionTypes={["nav-forward"]} />
                }
              >
                Our approach <ArrowRight aria-hidden="true" />
              </Button>
            </div>
            <div className="grid gap-5 rounded-[1.5rem] border border-border bg-secondary p-7 sm:grid-cols-[auto_1fr] sm:items-start sm:p-10 lg:grid-cols-1">
              <span className="flex size-12 items-center justify-center rounded-xl bg-card text-primary">
                <MapPin
                  className="size-5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              <div>
                <h3 className="text-xl font-semibold">Missouri perspective</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Neighborhood context and practical property knowledge shape
                  every recommendation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-20 sm:py-28">
          <div className="public-container grid items-center gap-10 lg:grid-cols-[.82fr_1.18fr] lg:gap-20">
            <div>
              <p className="text-sm font-semibold text-primary">
                A capable team after closing day
              </p>
              <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
                Good property care is visible.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
                Owners get accountable oversight. Residents get clear answers.
                Properties get the attention that protects their long-term
                value.
              </p>
              <Link
                href="/contact"
                transitionTypes={["nav-forward"]}
                className="focus-ring mt-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-foreground hover:text-primary"
              >
                Ask about property management{" "}
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="relative min-h-[25rem] overflow-hidden rounded-[1.5rem] sm:min-h-[34rem]">
              <Image
                src="/images/coach-johnson/missouri-brick-rental.webp"
                alt="Well-maintained brick rental building in Missouri"
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section id="portal-access" className="scroll-mt-24 py-20 sm:py-24">
          <div className="public-container grid gap-9 rounded-[1.5rem] border border-border bg-secondary p-7 sm:p-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:p-14">
            <div>
              <span className="flex size-12 items-center justify-center rounded-xl bg-card text-primary">
                <MessageSquareText
                  className="size-5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                Already working with us?
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                Choose the secure workspace that matches your relationship with
                Coach Johnson Realty.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                [
                  "Resident portal",
                  "/tenant/login",
                  "Lease, payments, and service",
                ],
                ["Agent workspace", "/agent/login", "Listings and inquiries"],
                ["Staff access", "/admin/login", "Property operations"],
              ].map(([title, href, description]) => (
                <Link
                  key={title}
                  href={href}
                  transitionTypes={["nav-forward"]}
                  className="focus-ring group rounded-[1.25rem] border border-border bg-card p-5 transition-[border-color,transform] duration-200 hover:-translate-y-1 hover:border-primary/35"
                >
                  <p className="font-semibold text-foreground group-hover:text-primary">
                    {title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {description}
                  </p>
                  <ArrowRight
                    className="mt-5 size-4 text-primary"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
