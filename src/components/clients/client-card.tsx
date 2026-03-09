"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spotlight } from "@/components/ui/spotlight";
import { FileText, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import type { Client } from "@/types";

interface ClientCardProps {
  client: Client;
}

export function ClientCard({ client }: ClientCardProps) {
  const firstLogo = client.assets_data?.logos?.[0];

  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="group cursor-pointer overflow-hidden border-border/50 transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-violet-500/5">
        <Spotlight
          className="from-violet-400/10 via-violet-500/5 to-transparent"
          size={180}
        />
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {firstLogo ? (
                <img
                  src={firstLogo}
                  alt={client.name}
                  className="h-11 w-11 rounded-xl border border-border/50 object-contain"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-foreground transition-colors group-hover:text-violet-400">
                  {client.name}
                </h3>
                {client.industry && (
                  <p className="truncate text-xs text-muted-foreground">
                    {client.industry}
                  </p>
                )}
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 transition-all group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
