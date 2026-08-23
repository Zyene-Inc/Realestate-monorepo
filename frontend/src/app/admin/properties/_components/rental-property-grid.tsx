import Image from "next/image";
import { Building2, Eye, EyeOff, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RentalProperty } from "./rental-property-types";

export function RentalPropertyGrid({
  properties,
  busy,
  onEdit,
  onPublishChange,
}: {
  properties: RentalProperty[];
  busy: boolean;
  onEdit: (property: RentalProperty) => void;
  onPublishChange: (property: RentalProperty) => Promise<void>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {properties.map((property) => (
        <Card key={property.id} className="overflow-hidden">
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[9rem_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
              {property.photos[0] ? (
                <Image
                  src={property.photos[0]}
                  alt={`${property.name} exterior`}
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              ) : (
                <Building2 className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{property.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {property.address}, {property.city}, {property.state}
                  </p>
                </div>
                <Badge
                  variant={
                    property.publishStatus === "PUBLISHED"
                      ? "default"
                      : "outline"
                  }
                >
                  {property.publishStatus.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {property.units.length} units · {property.status}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(property)}
                >
                  <Pencil aria-hidden="true" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant={
                    property.publishStatus === "PUBLISHED"
                      ? "outline"
                      : "default"
                  }
                  disabled={busy}
                  onClick={() => void onPublishChange(property)}
                >
                  {property.publishStatus === "PUBLISHED" ? (
                    <EyeOff aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                  {property.publishStatus === "PUBLISHED"
                    ? "Unpublish"
                    : "Publish"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
