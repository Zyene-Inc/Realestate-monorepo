import { noIndexMetadata } from "@/lib/seo";

export const metadata = noIndexMetadata;

export default function RentalApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
