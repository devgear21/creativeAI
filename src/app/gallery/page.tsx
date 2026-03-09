"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Image as ImageIcon, Loader2, Maximize2, Trash2, Grid3X3 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ASPECT_RATIOS, type AspectRatio } from "@/types";
import type { Client, Creative } from "@/types";

export default function GalleryPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("all");
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);

  const [childCreatives, setChildCreatives] = useState<Creative[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const [resizeRatio, setResizeRatio] = useState<AspectRatio | "">("");
  const [resizing, setResizing] = useState(false);
  const [resizeTaskId, setResizeTaskId] = useState<string | null>(null);
  const [resizeCreativeId, setResizeCreativeId] = useState<string | null>(null);
  const resizePollingRef = useRef<NodeJS.Timeout | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteCreative() {
    if (!selectedCreative) return;
    setDeleting(true);
    try {
      const supabase = createClient();

      if (selectedCreative.image_url) {
        const url = new URL(selectedCreative.image_url);
        const pathParts = url.pathname.split("/creatives/");
        if (pathParts[1]) {
          await supabase.storage.from("creatives").remove([decodeURIComponent(pathParts[1])]);
        }
      }

      const { error } = await supabase.from("creatives").delete().eq("id", selectedCreative.id);
      if (error) throw error;

      setCreatives((prev) => prev.filter((c) => c.id !== selectedCreative.id));
      setSelectedCreative(null);
      setConfirmDelete(false);
      toast.success("Creative deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete creative");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [clientsRes, creativesRes] = await Promise.all([
        supabase.from("clients").select("*").order("name"),
        supabase
          .from("creatives")
          .select("*, client:clients(name), campaign:campaigns(headline, platform)")
          .eq("status", "completed")
          .is("parent_creative_id", null)
          .order("created_at", { ascending: false }),
      ]);

      setClients(clientsRes.data || []);
      setCreatives(creativesRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedCreative) {
      setChildCreatives([]);
      return;
    }

    async function loadChildren() {
      setLoadingChildren(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("creatives")
        .select("*")
        .eq("parent_creative_id", selectedCreative!.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });
      setChildCreatives(data || []);
      setLoadingChildren(false);
    }
    loadChildren();
  }, [selectedCreative]);

  const pollResize = useCallback(async () => {
    if (!resizeTaskId || !resizeCreativeId) return;
    try {
      const res = await fetch(
        `/api/generate/status?taskId=${resizeTaskId}&creativeId=${resizeCreativeId}`
      );
      const data = await res.json();
      if (data.status === "completed") {
        if (resizePollingRef.current) clearInterval(resizePollingRef.current);
        setResizing(false);
        setResizeTaskId(null);
        setResizeCreativeId(null);
        setResizeRatio("");
        toast.success("Creative resized successfully!");
        if (selectedCreative) {
          const supabase = createClient();
          const { data: children } = await supabase
            .from("creatives")
            .select("*")
            .eq("parent_creative_id", selectedCreative.id)
            .eq("status", "completed")
            .order("created_at", { ascending: false });
          if (children) setChildCreatives(children);
        }
      } else if (data.status === "failed") {
        if (resizePollingRef.current) clearInterval(resizePollingRef.current);
        setResizing(false);
        setResizeTaskId(null);
        setResizeCreativeId(null);
        toast.error("Resize generation failed");
      }
    } catch {
      // Continue polling on error
    }
  }, [resizeTaskId, resizeCreativeId, selectedCreative]);

  useEffect(() => {
    if (resizeTaskId) {
      if (resizePollingRef.current) clearInterval(resizePollingRef.current);
      resizePollingRef.current = setInterval(pollResize, 5000);
    }
    return () => {
      if (resizePollingRef.current) clearInterval(resizePollingRef.current);
    };
  }, [resizeTaskId, pollResize]);

  async function handleResize() {
    if (!selectedCreative || !resizeRatio) return;
    setResizing(true);
    try {
      const res = await fetch("/api/generate/resize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creative_id: selectedCreative.id,
          aspect_ratio: resizeRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resize failed");
      setResizeTaskId(data.taskId);
      setResizeCreativeId(data.creativeId);
      toast.info("Resize started! This may take 30-60 seconds...");
    } catch (err) {
      setResizing(false);
      toast.error(err instanceof Error ? err.message : "Resize failed");
    }
  }

  const filtered =
    filterClient === "all"
      ? creatives
      : creatives.filter((c) => c.client_id === filterClient);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-violet-400">
            <Grid3X3 className="h-3.5 w-3.5" />
            Creative Library
          </div>
          <h1 className="text-2xl font-bold text-foreground">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All generated creatives ({filtered.length})
          </p>
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-48 border-border/50">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-2xl bg-muted/50 p-4">
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No creatives found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((creative) => (
            <Card
              key={creative.id}
              className="group cursor-pointer overflow-hidden border-border/50 transition-all duration-300 hover:border-border hover:shadow-xl hover:shadow-violet-500/5"
              onClick={() => setSelectedCreative(creative)}
            >
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
                <p className="truncate text-sm font-medium text-foreground">
                  {(creative.client as unknown as { name: string })?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(creative.created_at), "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full-size Modal */}
      <Dialog
        open={!!selectedCreative}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCreative(null);
            setResizeRatio("");
            setConfirmDelete(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {(selectedCreative?.client as unknown as { name: string })?.name || "Creative"}
              </span>
              <div className="flex items-center gap-2">
                {selectedCreative?.aspect_ratio && (
                  <Badge variant="outline" className="text-xs border-border/50">
                    {selectedCreative.aspect_ratio}
                  </Badge>
                )}
                {(selectedCreative?.campaign as unknown as { platform: string })?.platform && (
                  <Badge variant="secondary" className="capitalize">
                    {(selectedCreative?.campaign as unknown as { platform: string })?.platform}
                  </Badge>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedCreative?.image_url && (
            <div className="space-y-4">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                <Image
                  src={selectedCreative.image_url}
                  alt="Creative full size"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Resized Versions */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Resized Versions
                </p>
                {loadingChildren ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                ) : childCreatives.length === 0 ? (
                  <p className="py-1 text-xs text-muted-foreground/70">
                    No resized versions yet. Use the resize option below.
                  </p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {childCreatives.map((child) => (
                      <div key={child.id} className="flex shrink-0 flex-col items-center gap-1">
                        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border/50">
                          <Image
                            src={child.image_url!}
                            alt={`Resized ${child.aspect_ratio}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <Badge variant="outline" className="border-border/50 text-[10px]">
                          {child.aspect_ratio || "-"}
                        </Badge>
                        <a
                          href={child.image_url!}
                          download={`creative-${child.id}.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resize Option */}
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/50 p-3">
                <Maximize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select
                  value={resizeRatio}
                  onValueChange={(v) => setResizeRatio(v as AspectRatio)}
                >
                  <SelectTrigger className="h-9 flex-1 border-border/50">
                    <SelectValue placeholder="Resize to aspect ratio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ar) => (
                      <SelectItem key={ar.value} value={ar.value}>
                        {ar.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!resizeRatio || resizing}
                  onClick={handleResize}
                  className="bg-violet-600 hover:bg-violet-500"
                >
                  {resizing ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Resizing...
                    </>
                  ) : (
                    "Resize"
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedCreative.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </p>
                <div className="flex items-center gap-2">
                  {confirmDelete ? (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5">
                      <span className="text-xs text-red-400">Delete?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleting}
                        onClick={handleDeleteCreative}
                        className="h-7 px-2 text-xs"
                      >
                        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmDelete(false)}
                        className="h-7 border-border/50 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmDelete(true)}
                      className="border-border/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                  <a
                    href={selectedCreative.image_url}
                    download={`creative-${selectedCreative.id}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="border-border/50">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Download
                    </Button>
                  </a>
                </div>
              </div>

              {selectedCreative.prompt_used && (
                <div className="rounded-xl bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Prompt</p>
                  <p className="text-xs leading-relaxed text-muted-foreground/80">
                    {selectedCreative.prompt_used}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
