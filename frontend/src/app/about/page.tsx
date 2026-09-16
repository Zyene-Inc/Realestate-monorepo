import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  Handshake,
  Home,
} from "lucide-react";
import { DirectionalPage } from "@/components/page-transition";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { Button } from "@/components/ui/button";

const principles = [
  {
    icon: Home,
    title: "Care for the whole home",
    copy: "We treat maintenance, communication, and resident experience as one connected responsibility.",
  },
  {
    icon: Building2,
    title: "Invest for the long term",
    copy: "We restore and manage properties with durable materials, sound operations, and neighborhood value in mind.",
  },
  {
    icon: Handshake,
    title: "Make expectations clear",
    copy: "Residents, owners, and agents should always know what happens next and who is responsible.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <DirectionalPage>
        <main id="main-content">
          <section className="public-container grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:py-32">
            <div>
              <p className="text-sm font-semibold text-primary">Our approach</p>
              <h1 className="mt-4 max-w-4xl text-[clamp(3rem,7vw,6.8rem)] font-semibold leading-[.96] tracking-[-0.055em]">
                Real estate work rooted in Kansas City.
              </h1>
            </div>
            <p className="max-w-lg text-base leading-7 text-muted-foreground lg:pb-2 lg:text-lg">
              Harold and Diane Johnson bring local judgment, clear systems,
              and long-term care to every property relationship.
            </p>
          </section>

          <section className="public-container pb-16 sm:pb-24">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] sm:aspect-[16/8]">
              <Image
                src="/about-interior.png"
                alt="Warm, thoughtfully restored apartment interior"
                fill
                loading="eager"
                sizes="(min-width: 1440px) 1408px, calc(100vw - 32px)"
                className="object-cover"
              />
            </div>
          </section>

          <section className="border-y border-border bg-secondary py-16 sm:py-24">
            <div className="public-container grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
              <div>
                <p className="text-sm font-semibold text-primary">
                  In the community
                </p>
                <h2 className="mt-4 max-w-lg text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
                  Neyan&apos;s Place is a commitment to stay and build.
                </h2>
                <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                  The Johnsons&apos; Midtown Kansas City project shows what
                  community-rooted ownership can look like: restoring a home,
                  raising the standard, and keeping quality housing connected
                  to the neighborhood.
                </p>
              </div>

              <article className="rounded-[1.5rem] border border-border bg-card p-6 sm:p-8 lg:p-10">
                <p className="text-sm font-semibold text-primary">
                  Featured by The Community Voice
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
                  Reinvesting in the neighborhood, one home at a time.
                </h3>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
                  In April 2026, <em>The Community Voice</em> profiled Harold
                  and Diane Johnson&apos;s transformation of a fire-damaged
                  six-unit building on East 30th Street into Neyan&apos;s Place:
                  fully leased, thoughtfully renovated housing in Midtown
                  Kansas City.
                </p>
                <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
                  Named for their oldest granddaughter, the project reflects a
                  family-centered approach to ownership—building homes people
                  can be proud to live in and a legacy the next generation can
                  help carry forward.
                </p>

                <dl className="mt-8 grid gap-4 border-y border-border py-6 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Restored
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">Six units</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Location
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">
                      Midtown Kansas City
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Today
                    </dt>
                    <dd className="mt-2 text-lg font-semibold">Fully leased</dd>
                  </div>
                </dl>

                <Button
                  nativeButton={false}
                  variant="outline"
                  className="mt-8"
                  render={
                    <a
                      href="https://www.communityvoiceks.com/2026/04/06/neyans-place-kansas-city-community-redevelopment/"
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                >
                  Read the Community Voice story
                  <ArrowUpRight aria-hidden="true" />
                </Button>
              </article>
            </div>
          </section>

          <section className="border-y border-border bg-card py-16 sm:py-24">
            <div className="public-container grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
              <div>
                <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
                  The standard behind the service.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
                  Our principles shape daily decisions, from a repair update to
                  a property renovation.
                </p>
              </div>
              <div className="border-t border-border">
                {principles.map((principle, index) => (
                  <article
                    key={principle.title}
                    className="grid gap-4 border-b border-border py-7 sm:grid-cols-[3rem_3rem_1fr] sm:items-start"
                  >
                    <span className="text-sm font-semibold text-muted-foreground">
                      0{index + 1}
                    </span>
                    <principle.icon
                      className="size-5 text-primary"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="text-lg font-semibold">
                        {principle.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                        {principle.copy}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="public-container grid gap-8 py-16 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-primary">
                Looking for a home?
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
                Start with the properties we are proud to manage.
              </h2>
            </div>
            <Button
              nativeButton={false}
              size="lg"
              render={
                <Link href="/properties" transitionTypes={["nav-forward"]} />
              }
            >
              Browse properties <ArrowRight aria-hidden="true" />
            </Button>
          </section>
        </main>
      </DirectionalPage>
      <SiteFooter />
    </div>
  );
}
