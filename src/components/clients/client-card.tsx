"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon } from "lucide-react";
import type { Client } from "@/types";

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  const firstLogo = client.assets_data?.logos?.[0];

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="group cursor-pointer transition-all hover:shadow-md">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-3">
            {firstLogo ? (
              <img
                src={firstLogo}
                alt={client.name}
                className="h-10 w-10 rounded-lg border object-contain"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold text-gray-900 transition-colors group-hover:text-violet-600">
                {client.name}
              </h3>
              {client.industry && (
                <p className="truncate text-xs text-gray-500">
                  {client.industry}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {client.brand_book_url && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="mr-1 h-3 w-3" />
                Brand Book
              </Badge>
            )}
            {(() => {
              const totalAssets = (client.assets_data?.logos?.length || 0) +
                (client.assets_data?.creatives_reference?.length || 0) +
                (client.assets_data?.landing_pages_reference?.length || 0);
              return totalAssets > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  <ImageIcon className="mr-1 h-3 w-3" />
                  {totalAssets} asset{totalAssets > 1 ? "s" : ""}
                </Badge>
              ) : null;
            })()}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
