"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Image as ImageIcon, Layers, Wand2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Creative } from "@/types";

export default function DashboardPage() {
  const [stats, setStats] = useState({ clients: 0, campaigns: 0, creatives: 0 });
  const [recentCreatives, setRecentCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      const [clientsRes, campaignsRes, creativesRes, recentRes] =
        await Promise.all([
          supabase.from("clients").select("id", { count: "exact", head: true }),
          supabase.from("campaigns").select("id", { count: "exact", head: true }),
          supabase.from("creatives").select("id", { count: "exact", head: true }),
          supabase
            .from("creatives")
            .select("*, client:clients(name)")
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

      setStats({
        clients: clientsRes.count || 0,
        campaigns: campaignsRes.count || 0,
        creatives: creativesRes.count || 0,
      });
      setRecentCreatives(recentRes.data || []);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const statCards = [
    { label: "Clients", value: stats.clients, icon: Users, color: "text-violet-600" },
    { label: "Campaigns", value: stats.campaigns, icon: Layers, color: "text-blue-600" },
    { label: "Creatives", value: stats.creatives, icon: ImageIcon, color: "text-emerald-600" },
  ];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome to CreativeAI</p>
        </div>
        <Link href="/generate">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Creative
          </Button>
        </Link>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Creatives
        </h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : recentCreatives.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-500">
                No creatives yet. Generate your first one!
              </p>
              <Link href="/generate" className="mt-3">
                <Button variant="outline" size="sm">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {recentCreatives.map((creative) => (
              <Link key={creative.id} href="/gallery">
                <Card className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-square">
                    <Image
                      src={creative.image_url!}
                      alt="Creative"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate text-xs text-gray-500">
                      {(creative.client as unknown as { name: string })?.name || "Unknown client"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
