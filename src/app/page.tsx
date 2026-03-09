"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { Users, Image as ImageIcon, Layers, Wand2, ArrowRight, TrendingUp } from "lucide-react";
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
    {
      label: "Clients",
      value: stats.clients,
      icon: Users,
      gradient: "from-violet-500/10 to-violet-600/5",
      iconColor: "text-violet-400",
      borderColor: "border-violet-500/10",
    },
    {
      label: "Campaigns",
      value: stats.campaigns,
      icon: Layers,
      gradient: "from-blue-500/10 to-blue-600/5",
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/10",
    },
    {
      label: "Creatives",
      value: stats.creatives,
      icon: ImageIcon,
      gradient: "from-emerald-500/10 to-emerald-600/5",
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section with 3D Element */}
      <Card className="relative h-[320px] overflow-hidden border-border/50 bg-black/[0.96]">
        <Spotlight
          className="from-violet-400/20 via-violet-500/10 to-transparent"
          size={300}
        />

        <div className="flex h-full">
          {/* Left content */}
          <div className="relative z-10 flex flex-1 flex-col justify-center p-8 lg:p-10">
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <TrendingUp className="h-3 w-3" />
              AI-Powered Creative Studio
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              <span className="bg-gradient-to-b from-neutral-50 to-neutral-400 bg-clip-text text-transparent">
                Welcome to
              </span>
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-violet-200 bg-clip-text text-transparent">
                CreativeAI
              </span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-400">
              Generate stunning ad creatives powered by AI. Select a client, write your brief, and watch the magic happen.
            </p>
            <div className="mt-5 flex gap-3">
              <Link href="/generate">
                <Button className="bg-violet-600 shadow-lg shadow-violet-500/20 hover:bg-violet-500">
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Creative
                </Button>
              </Link>
              <Link href="/clients">
                <Button variant="outline" className="border-white/10 text-neutral-300 hover:bg-white/5 hover:text-white">
                  View Clients
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Right 3D scene */}
          <div className="hidden flex-1 md:block">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="h-full w-full"
            />
          </div>
        </div>
      </Card>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={`group relative overflow-hidden border-border/50 bg-gradient-to-br ${stat.gradient} transition-all duration-300 hover:border-border hover:shadow-lg`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-lg bg-background/50 p-2 ${stat.iconColor}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-9 w-20" />
              ) : (
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Creatives */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Creatives
          </h2>
          {recentCreatives.length > 0 && (
            <Link href="/gallery">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : recentCreatives.length === 0 ? (
          <Card className="border-dashed border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-2xl bg-violet-500/10 p-4">
                <ImageIcon className="h-8 w-8 text-violet-400" />
              </div>
              <p className="mb-1 text-sm font-medium text-foreground">
                No creatives yet
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Generate your first AI-powered creative
              </p>
              <Link href="/generate">
                <Button size="sm" className="bg-violet-600 hover:bg-violet-500">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {recentCreatives.map((creative) => (
              <Link key={creative.id} href="/gallery">
                <Card className="group cursor-pointer overflow-hidden border-border/50 transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-violet-500/5">
                  <div className="relative aspect-square">
                    <Image
                      src={creative.image_url!}
                      alt="Creative"
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate text-xs font-medium text-muted-foreground">
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
