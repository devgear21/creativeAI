"use client";

import { Suspense, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spotlight } from "@/components/ui/spotlight";
import { toast } from "sonner";
import {
  Wand2,
  Loader2,
  Download,
  CheckCircle2,
  XCircle,
  Sparkles,
  Check,
  ImagePlus,
  Globe,
  X,
  Image as ImageIcon,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PLATFORMS,
  ASPECT_RATIOS,
  PLATFORM_DEFAULT_RATIOS,
  CREATIVE_STYLES,
  TEXT_POSITIONS,
  type Client,
  type Platform,
  type AspectRatio,
  type CreativeStyle,
  type TextPosition,
} from "@/types";

interface GenerationResult {
  creativeId: string;
  taskId: string;
  status: "waiting" | "queuing" | "generating" | "completed" | "failed";
  image_url?: string;
}

export default function GeneratePage() {
  return (
    <Suspense>
      <GeneratePageContent />
    </Suspense>
  );
}

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const preselectedClient = searchParams.get("client");

  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Form state
  const [clientId, setClientId] = useState(preselectedClient || "");
  const [headline, setHeadline] = useState("");
  const [adCopy, setAdCopy] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [numVariations, setNumVariations] = useState(1);
  const [creativeStyle, setCreativeStyle] = useState<CreativeStyle>("with_text");
  const [headlinePosition, setHeadlinePosition] = useState<TextPosition>("default");
  const [adCopyPosition, setAdCopyPosition] = useState<TextPosition>("default");
  const [creativeDirection, setCreativeDirection] = useState("");
  const [generating, setGenerating] = useState(false);

  // Categorized asset selections
  const [selectedLogos, setSelectedLogos] = useState<string[]>([]);
  const [selectedCreativeRefs, setSelectedCreativeRefs] = useState<string[]>([]);
  const [selectedLpRefs, setSelectedLpRefs] = useState<string[]>([]);

  // Upload state for ad-hoc uploads on the generate page
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [uploadingCreativeRefs, setUploadingCreativeRefs] = useState(false);
  const [uploadingLpRefs, setUploadingLpRefs] = useState(false);

  // Extra uploaded assets (not from client record)
  const [extraLogos, setExtraLogos] = useState<string[]>([]);
  const [extraCreativeRefs, setExtraCreativeRefs] = useState<string[]>([]);
  const [extraLpRefs, setExtraLpRefs] = useState<string[]>([]);

  // Preview modal
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Results state
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [promptUsed, setPromptUsed] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Load clients
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      setClients(data || []);
      setLoadingClients(false);
    }
    load();
  }, []);

  // Auto-set aspect ratio when platform changes
  useEffect(() => {
    setAspectRatio(PLATFORM_DEFAULT_RATIOS[platform]);
  }, [platform]);

  // Reset asset selections when client changes
  useEffect(() => {
    setSelectedLogos([]);
    setSelectedCreativeRefs([]);
    setSelectedLpRefs([]);
    setExtraLogos([]);
    setExtraCreativeRefs([]);
    setExtraLpRefs([]);
  }, [clientId]);

  // Polling logic
  const pollResults = useCallback(async () => {
    const pending = results.filter(
      (r) => r.status !== "completed" && r.status !== "failed"
    );
    if (pending.length === 0) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const updated = [...results];
    for (const result of pending) {
      try {
        const res = await fetch(
          `/api/generate/status?taskId=${result.taskId}&creativeId=${result.creativeId}`
        );
        const data = await res.json();

        const idx = updated.findIndex(
          (r) => r.creativeId === result.creativeId
        );
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            status: data.status,
            image_url: data.image_url,
          };
        }
      } catch {
        // Continue polling on error
      }
    }
    setResults(updated);

    // Check if all done
    const allDone = updated.every(
      (r) => r.status === "completed" || r.status === "failed"
    );
    if (allDone) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      const completed = updated.filter((r) => r.status === "completed").length;
      if (completed > 0) {
        toast.success(`${completed} creative${completed > 1 ? "s" : ""} generated!`);
      }
    }
  }, [results]);

  // Start/stop polling when results change
  useEffect(() => {
    const hasPending = results.some(
      (r) => r.status !== "completed" && r.status !== "failed"
    );
    if (hasPending) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(pollResults, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [results, pollResults]);

  // Upload helper
  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "assets");
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.url;
  }

  async function handleUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setExtras: React.Dispatch<React.SetStateAction<string[]>>,
    setSelected: React.Dispatch<React.SetStateAction<string[]>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
    label: string
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        if (url) newUrls.push(url);
      }
      setExtras((prev) => [...prev, ...newUrls]);
      setSelected((prev) => [...prev, ...newUrls]);
      toast.success(`${newUrls.length} ${label} uploaded`);
    } catch {
      toast.error(`Failed to upload ${label}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    setGenerating(true);
    setResults([]);
    setPromptUsed("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          headline: creativeStyle === "with_text" ? (headline.trim() || undefined) : undefined,
          ad_copy: creativeStyle === "with_text" ? (adCopy.trim() || undefined) : undefined,
          platform,
          aspect_ratio: aspectRatio,
          num_variations: numVariations,
          creative_style: creativeStyle,
          headline_position: creativeStyle === "with_text" ? headlinePosition : undefined,
          ad_copy_position: creativeStyle === "with_text" ? adCopyPosition : undefined,
          logo_urls: selectedLogos.length > 0 ? selectedLogos : undefined,
          creative_ref_urls: selectedCreativeRefs.length > 0 ? selectedCreativeRefs : undefined,
          lp_ref_urls: selectedLpRefs.length > 0 ? selectedLpRefs : undefined,
          creative_direction: creativeDirection.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setPromptUsed(data.prompt);
      setResults(
        data.results.map((r: { creativeId: string; taskId: string }) => ({
          ...r,
          status: "waiting" as const,
        }))
      );

      toast.info("Generation started! This may take 30-60 seconds...");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-violet-400" />;
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "waiting":
        return "Waiting...";
      case "queuing":
        return "In Queue";
      case "generating":
        return "Generating...";
      case "completed":
        return "Complete";
      case "failed":
        return "Failed";
      default:
        return status;
    }
  }

  const selectedClient = clients.find((c) => c.id === clientId);

  const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
  const isImageUrl = (url: string) => {
    const lower = url.toLowerCase().split("?")[0];
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  };

  // Build categorized asset lists from client data + extras
  const logoOptions = [
    ...new Set([
      ...(selectedClient?.logo_url && isImageUrl(selectedClient.logo_url)
        ? [selectedClient.logo_url]
        : []),
      ...(selectedClient?.assets_data?.logos || []).filter(isImageUrl),
      ...extraLogos,
    ]),
  ];
  const creativeRefOptions = [
    ...new Set([
      ...(selectedClient?.assets_data?.creatives_reference || []).filter(isImageUrl),
      ...extraCreativeRefs,
    ]),
  ];
  const lpRefOptions = [
    ...new Set([
      ...(selectedClient?.assets_data?.landing_pages_reference || []).filter(isImageUrl),
      ...extraLpRefs,
    ]),
  ];

  // Total selected count (for max 8 limit)
  const totalSelected = selectedLogos.length + selectedCreativeRefs.length + selectedLpRefs.length;

  // Asset picker section component
  function AssetPickerSection({
    label,
    icon: Icon,
    options,
    selected,
    setSelected,
    uploading,
    uploadId,
    onUpload,
  }: {
    label: string;
    icon: React.ElementType;
    options: string[];
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
    uploading: boolean;
    uploadId: string;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-violet-400" />
          {label}{" "}
          <span className="text-muted-foreground/50">(optional)</span>
        </Label>

        {options.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {options.map((url) => {
              const isSelected = selected.includes(url);
              const atLimit = totalSelected >= 8 && !isSelected;
              return (
                <div
                  key={url}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-violet-500 ring-2 ring-violet-500/20"
                      : atLimit
                        ? "cursor-not-allowed border-border/30 opacity-40"
                        : "cursor-pointer border-border/50 hover:border-border"
                  }`}
                  onClick={() => {
                    if (atLimit) return;
                    setSelected((prev) =>
                      isSelected
                        ? prev.filter((u) => u !== url)
                        : [...prev, url]
                    );
                  }}
                >
                  <Image
                    src={url}
                    alt={`${label} option`}
                    fill
                    className="object-cover"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-violet-500/20">
                      <div className="rounded-full bg-violet-500 p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(url);
                    }}
                    className="absolute bottom-1 right-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <label
          htmlFor={uploadId}
          className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-border/50 p-3 text-center transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          ) : (
            <ImagePlus className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {uploading ? "Uploading..." : `Upload ${label.toLowerCase()}`}
          </span>
        </label>
        <input
          id={uploadId}
          type="file"
          accept="image/*,.svg"
          multiple
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
        />

        {selected.length > 0 && (
          <p className="text-xs text-violet-400">
            {selected.length} selected
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs font-medium text-violet-400 mb-1">
          <Zap className="h-3.5 w-3.5" />
          AI Generation
        </div>
        <h1 className="text-2xl font-bold text-foreground">Generate Creative</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create AI-powered ad creatives for your clients
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <form onSubmit={handleGenerate}>
          <div className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="rounded-lg bg-violet-500/10 p-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  Campaign Brief
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Client *</Label>
                  {loadingClients ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedClient && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedClient.visual_vibe && (
                        <Badge variant="secondary" className="max-w-[200px] truncate text-xs" title={selectedClient.visual_vibe}>
                          {selectedClient.visual_vibe}
                        </Badge>
                      )}
                      {selectedClient.primary_color && (
                        <Badge variant="secondary" className="max-w-[120px] truncate text-xs" title={selectedClient.primary_color}>
                          {selectedClient.primary_color}
                        </Badge>
                      )}
                      {selectedClient.heading_font && (
                        <Badge variant="secondary" className="max-w-[120px] truncate text-xs" title={selectedClient.heading_font}>
                          {selectedClient.heading_font}
                        </Badge>
                      )}
                      {selectedClient.tone_of_voice && (
                        <Badge variant="secondary" className="max-w-[160px] truncate text-xs" title={selectedClient.tone_of_voice}>
                          {selectedClient.tone_of_voice}
                        </Badge>
                      )}
                      {selectedClient.industry && (
                        <Badge variant="secondary" className="max-w-[120px] truncate text-xs" title={selectedClient.industry}>
                          {selectedClient.industry}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Creative Style Toggle */}
                <div className="space-y-2">
                  <Label>Creative Style *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {CREATIVE_STYLES.map((cs) => (
                      <button
                        key={cs.value}
                        type="button"
                        onClick={() => setCreativeStyle(cs.value)}
                        className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                          creativeStyle === cs.value
                            ? "border-violet-500 bg-violet-500/10"
                            : "border-border/50 hover:border-border"
                        }`}
                      >
                        <p className={`text-sm font-medium ${
                          creativeStyle === cs.value ? "text-violet-400" : "text-foreground"
                        }`}>
                          {cs.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cs.description}
                        </p>
                      </button>
                    ))}
                  </div>
                  {selectedClient && (
                    <p className="text-xs text-muted-foreground/70">
                      Client type: <span className="font-medium text-muted-foreground">{selectedClient.client_type === "service" ? "Service Based" : "Product Based"}</span>
                    </p>
                  )}
                </div>

                {creativeStyle === "with_text" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="headline">
                        Headline{" "}
                        <span className="text-muted-foreground/50">(optional)</span>
                      </Label>
                      <Input
                        id="headline"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Summer Sale - 50% Off Everything"
                      />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Position:</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {TEXT_POSITIONS.map((tp) => (
                            <button
                              key={tp.value}
                              type="button"
                              onClick={() => setHeadlinePosition(tp.value)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                                headlinePosition === tp.value
                                  ? "border-violet-500 bg-violet-500/10 text-violet-400"
                                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                              }`}
                            >
                              {tp.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ad_copy">
                        Ad Copy / Brief{" "}
                        <span className="text-muted-foreground/50">(optional)</span>
                      </Label>
                      <Textarea
                        id="ad_copy"
                        value={adCopy}
                        onChange={(e) => setAdCopy(e.target.value)}
                        placeholder="Describe what should be in the image. Include any specific elements, mood, or style directions..."
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Position:</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {TEXT_POSITIONS.map((tp) => (
                            <button
                              key={tp.value}
                              type="button"
                              onClick={() => setAdCopyPosition(tp.value)}
                              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                                adCopyPosition === tp.value
                                  ? "border-violet-500 bg-violet-500/10 text-violet-400"
                                  : "border-border/50 text-muted-foreground hover:border-border hover:text-foreground"
                              }`}
                            >
                              {tp.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {creativeStyle === "visuals_only" && (
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Visuals Only</span> — The generated creative will contain no text, headlines, or typographic elements.
                      Pure visual composition only.
                    </p>
                  </div>
                )}

                {/* Creative Direction / Reference */}
                <div className="space-y-2">
                  <Label htmlFor="creative_direction">
                    Creative Direction{" "}
                    <span className="text-muted-foreground/50">(optional)</span>
                  </Label>
                  <Textarea
                    id="creative_direction"
                    value={creativeDirection}
                    onChange={(e) => setCreativeDirection(e.target.value)}
                    placeholder='e.g. "Follow Trustpilot user review UI", "Use glassmorphism style cards", "Inspired by Apple minimalist product pages"...'
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground/60">
                    Add any creative references, UI inspirations, or art direction notes.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={platform}
                      onValueChange={(v) => setPlatform(v as Platform)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select
                      value={aspectRatio}
                      onValueChange={(v) => setAspectRatio(v as AspectRatio)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASPECT_RATIOS.map((ar) => (
                          <SelectItem key={ar.value} value={ar.value}>
                            {ar.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Number of Variations</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={numVariations === n ? "default" : "outline"}
                        size="sm"
                        className={
                          numVariations === n
                            ? "bg-violet-600 hover:bg-violet-500"
                            : "border-border/50"
                        }
                        onClick={() => setNumVariations(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Selection Card */}
            {selectedClient && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <div className="rounded-lg bg-violet-500/10 p-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      Reference Assets
                    </span>
                    {totalSelected > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {totalSelected}/8 selected
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <AssetPickerSection
                    label="Logo"
                    icon={ImageIcon}
                    options={logoOptions}
                    selected={selectedLogos}
                    setSelected={setSelectedLogos}
                    uploading={uploadingLogos}
                    uploadId="gen-logo-upload"
                    onUpload={(e) =>
                      handleUpload(e, setExtraLogos, setSelectedLogos, setUploadingLogos, "logo(s)")
                    }
                  />

                  <div className="border-t border-border/30" />

                  <AssetPickerSection
                    label="Creative Reference"
                    icon={ImagePlus}
                    options={creativeRefOptions}
                    selected={selectedCreativeRefs}
                    setSelected={setSelectedCreativeRefs}
                    uploading={uploadingCreativeRefs}
                    uploadId="gen-creative-ref-upload"
                    onUpload={(e) =>
                      handleUpload(e, setExtraCreativeRefs, setSelectedCreativeRefs, setUploadingCreativeRefs, "creative reference(s)")
                    }
                  />

                  <div className="border-t border-border/30" />

                  <AssetPickerSection
                    label="Landing Page Reference"
                    icon={Globe}
                    options={lpRefOptions}
                    selected={selectedLpRefs}
                    setSelected={setSelectedLpRefs}
                    uploading={uploadingLpRefs}
                    uploadId="gen-lp-ref-upload"
                    onUpload={(e) =>
                      handleUpload(e, setExtraLpRefs, setSelectedLpRefs, setUploadingLpRefs, "landing page reference(s)")
                    }
                  />
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              disabled={generating || results.some((r) => r.status !== "completed" && r.status !== "failed")}
              className="w-full bg-violet-600 shadow-lg shadow-violet-500/20 hover:bg-violet-500"
              size="lg"
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {generating ? "Starting Generation..." : "Generate"}
            </Button>
          </div>
        </form>

        {/* Results */}
        <div className="space-y-4">
          {results.length > 0 && (
            <>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Generation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.map((result, i) => (
                      <div
                        key={result.creativeId}
                        className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/30 p-3"
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          <span className="text-sm font-medium">
                            Variation {i + 1}
                          </span>
                        </div>
                        <Badge
                          variant={
                            result.status === "completed"
                              ? "default"
                              : result.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className={
                            result.status === "completed"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : ""
                          }
                        >
                          {getStatusLabel(result.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Generated Images */}
              <div className="grid gap-4 sm:grid-cols-2">
                {results.map((result, i) => (
                  <Card key={result.creativeId} className="overflow-hidden border-border/50">
                    {result.status === "completed" && result.image_url ? (
                      <>
                        <div className="relative aspect-square">
                          <Image
                            src={result.image_url}
                            alt={`Variation ${i + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <CardContent className="p-3">
                          <a
                            href={result.image_url}
                            download={`creative-${result.creativeId}.png`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-border/50"
                            >
                              <Download className="mr-2 h-3.5 w-3.5" />
                              Download
                            </Button>
                          </a>
                        </CardContent>
                      </>
                    ) : result.status === "failed" ? (
                      <CardContent className="flex aspect-square flex-col items-center justify-center">
                        <XCircle className="mb-2 h-8 w-8 text-red-400/50" />
                        <p className="text-sm text-red-400">
                          Generation failed
                        </p>
                      </CardContent>
                    ) : (
                      <CardContent className="flex aspect-square flex-col items-center justify-center">
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-violet-400/50" />
                        <p className="text-sm text-muted-foreground">
                          {getStatusLabel(result.status)}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Prompt Used */}
              {promptUsed && (
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Prompt Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {promptUsed}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {results.length === 0 && (
            <Card className="border-border/50 overflow-hidden">
              <Spotlight
                className="from-violet-400/10 via-violet-500/5 to-transparent"
                size={250}
              />
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 p-5">
                  <Wand2 className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="mb-1 font-semibold text-foreground">
                  Ready to create
                </h3>
                <p className="text-center text-sm text-muted-foreground">
                  Fill in the brief and hit Generate to create
                  <br />
                  AI-powered ad creatives
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -right-3 -top-3 z-10 rounded-full bg-card p-1.5 shadow-lg transition-colors hover:bg-muted"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
