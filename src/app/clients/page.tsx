"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ClientCard } from "@/components/clients/client-card";
import type { Client } from "@/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      setClients(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-violet-400">
            <Users className="h-3.5 w-3.5" />
            Client Management
          </div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your client brand profiles
          </p>
        </div>
        <Link href="/clients/new">
          <Button className="bg-violet-600 shadow-lg shadow-violet-500/20 hover:bg-violet-500">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 py-16">
          <div className="mb-4 rounded-2xl bg-muted/50 p-4">
            <Users className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="mb-1 text-sm font-medium text-foreground">
            No clients yet
          </p>
          <p className="mb-4 text-xs text-muted-foreground">
            Add your first client to get started
          </p>
          <Link href="/clients/new">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-500">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
