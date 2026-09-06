import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async rewrites() {
    if (!backendUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
      {
        source: "/agent/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
      {
        source: "/tenant/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
      {
        source: "/auth/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
      {
        source: "/rentals/applications/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
      {
        source: "/rentals/:id/apply",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noimageindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
