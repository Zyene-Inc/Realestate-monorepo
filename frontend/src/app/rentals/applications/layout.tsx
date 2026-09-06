import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function RentalApplicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
