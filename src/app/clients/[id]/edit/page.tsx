"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { ClientForm } from "@/components/clients/client-form";
import type { Client } from "@/types";

export default function EditClientPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .single();
      setClient(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (!client) {
    return <p className="text-gray-500">Client not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ClientForm mode="edit" defaultValues={client} />
    </div>
  );
}
