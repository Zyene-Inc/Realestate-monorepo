import type { Metadata } from "next";
import { PORTAL_ORIGINS } from "./portal-domains";

export const SITE_NAME = "Coach Johnson Realty";
export const SITE_URL = PORTAL_ORIGINS.public;
export const SITE_DESCRIPTION =
  "Coach Johnson Realty helps Missouri buyers, sellers, renters, and property owners with local real estate representation, rentals, and property management.";
export const SITE_OG_IMAGE = "/images/coach-johnson/missouri-home-interior.webp";

export function absoluteSiteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  image?: string;
};

export function pageMetadata({
  title,
  description,
  path,
  image = SITE_OG_IMAGE,
}: PageMetadataOptions): Metadata {
  const canonical = absoluteSiteUrl(path);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      images: [{ url: image, alt: `${title} — ${SITE_NAME}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export const noIndexMetadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};
