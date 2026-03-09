"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Pencil,
  Wand2,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Palette,
  Type,
  Eye,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Client, Campaign, Creative } from "@/types";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
        {label}
      </p>
      <p className="text-sm text-gray-700 whitespace-pre-line">{value}</p>
    </div>
  );
}

function ColorSwatch({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value.trim());
  return (
    <div className="flex items-center gap-3">
      {isHex && (
        <div
          className="h-8 w-8 shrink-0 rounded-md border shadow-sm"
          style={{ backgroundColor: value.trim() }}
        />
      )}
      <div>
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="text-sm text-gray-700">{value}</p>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      toast.success("Client deleted successfully");
      router.push("/clients");
    } catch (err) {
      toast.error("Failed to delete client");
      setDeleting(false);
    }
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [clientRes, campaignsRes, creativesRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase
          .from("campaigns")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("creatives")
          .select("*")
          .eq("client_id", id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      setClient(clientRes.data);
      setCampaigns(campaignsRes.data || []);
      setCreatives(creativesRes.data || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!client) {
    return <p className="text-gray-500">Client not found.</p>;
  }

  const firstLogo = client.assets_data?.logos?.[0];

  const hasBrandIdentity =
    client.brand_description || client.target_audience || client.visual_vibe;
  const hasColors =
    client.primary_color ||
    client.secondary_color ||
    client.other_colors ||
    client.gradient_variations;
  const hasFonts =
    client.heading_font || client.body_font || client.style_font;
  const hasVisualDirection =
    client.imagery_style || client.what_to_avoid || client.dos_and_donts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {firstLogo ? (
            <img
              src={firstLogo}
              alt={client.name}
              className="h-14 w-14 rounded-xl border object-contain"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600 text-xl font-bold text-white">
              {client.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            {client.industry && (
              <p className="text-sm text-gray-500">{client.industry}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </Button>
          <Link href={`/clients/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Link href={`/generate?client=${id}`}>
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
              <Wand2 className="mr-2 h-3.5 w-3.5" />
              Generate Creative
            </Button>
          </Link>
        </div>
      </div>

      {/* Brand Identity */}
      {hasBrandIdentity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-violet-500" />
              Brand Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="What the Brand Does" value={client.brand_description} />
            <DetailRow label="Who It's For" value={client.target_audience} />
            {client.visual_vibe && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Visual Vibe
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {client.visual_vibe.split(",").map((word, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {word.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Colors */}
      {hasColors && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4 text-violet-500" />
              Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorSwatch label="Primary" value={client.primary_color} />
              <ColorSwatch label="Secondary" value={client.secondary_color} />
            </div>
            <DetailRow label="Other Colors" value={client.other_colors} />
            <DetailRow label="Gradient Variations" value={client.gradient_variations} />
          </CardContent>
        </Card>
      )}

      {/* Fonts */}
      {hasFonts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="h-4 w-4 text-violet-500" />
              Fonts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <DetailRow label="Heading Font" value={client.heading_font} />
              <DetailRow label="Body Font" value={client.body_font} />
              <DetailRow label="Style Font" value={client.style_font} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visual Direction */}
      {hasVisualDirection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-violet-500" />
              Visual Direction &amp; Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DetailRow label="Imagery Style" value={client.imagery_style} />
            <DetailRow label="What to Avoid" value={client.what_to_avoid} />
            <DetailRow label="Do's & Don'ts" value={client.dos_and_donts} />
          </CardContent>
        </Card>
      )}

      {/* Brand Book */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-violet-500" />
            Brand Book
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.brand_book_url ? (
            <a
              href={client.brand_book_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <FileText className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Brand Guidelines Document
                </p>
                <p className="text-xs text-gray-500">
                  Click to view or download
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          ) : (
            <p className="text-sm text-gray-400">No brand book uploaded.</p>
          )}
        </CardContent>
      </Card>

      {/* Assets — 3 Categories */}
      {(client.assets_data?.logos?.length || client.assets_data?.creatives_reference?.length || client.assets_data?.landing_pages_reference?.length) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4 text-violet-500" />
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logos */}
            {client.assets_data?.logos && client.assets_data.logos.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Logos ({client.assets_data.logos.length})</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {client.assets_data.logos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
                      <img src={url} alt={`Logo ${i + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Creatives Reference */}
            {client.assets_data?.creatives_reference && client.assets_data.creatives_reference.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Creatives Reference ({client.assets_data.creatives_reference.length})</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {client.assets_data.creatives_reference.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
                      <img src={url} alt={`Creative ref ${i + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Landing Pages Reference */}
            {client.assets_data?.landing_pages_reference && client.assets_data.landing_pages_reference.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Landing Pages Reference ({client.assets_data.landing_pages_reference.length})</p>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {client.assets_data.landing_pages_reference.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="group relative aspect-square overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
                      <img src={url} alt={`Landing page ref ${i + 1}`} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      {/* Campaigns */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Campaigns ({campaigns.length})
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-gray-400">No campaigns yet.</p>
        ) : (
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {campaign.headline}
                    </p>
                    <p className="text-xs text-gray-500">
                      {campaign.platform} &middot; {campaign.aspect_ratio}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {campaign.platform}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Creatives */}
      {creatives.length > 0 && (
        <>
          <Separator />
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Recent Creatives
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {creatives.map((creative) => (
                <Card key={creative.id} className="overflow-hidden">
                  <div className="relative aspect-square">
                    <Image
                      src={creative.image_url!}
                      alt="Creative"
                      fill
                      className="object-cover"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{client.name}</strong>? This
              will permanently remove all associated campaigns, creatives, and
              brand data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Client"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
