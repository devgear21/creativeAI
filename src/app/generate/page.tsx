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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PLATFORMS,
  ASPECT_RATIOS,
  PLATFORM_DEFAULT_RATIOS,
  type Client,
  type Platform,
  type AspectRatio,
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
      // Reset input so same file can be re-selected
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
          headline: headline.trim() || undefined,
          ad_copy: adCopy.trim() || undefined,
          platform,
          aspect_ratio: aspectRatio,
          num_variations: numVariations,
          logo_urls: selectedLogos.length > 0 ? selectedLogos : undefined,
          creative_ref_urls: selectedCreativeRefs.length > 0 ? selectedCreativeRefs : undefined,
          lp_ref_urls: selectedLpRefs.length > 0 ? selectedLpRefs : undefined,
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
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin text-violet-500" />;
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
        <Label className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-violet-500" />
          {label}{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </Label>

        {options.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {options.map((url) => {
              const isSelected = selected.includes(url);
              const atLimit = totalSelected >= 8 && !isSelected;
              return (
                <div
                  key={url}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                    isSelected
                      ? "border-violet-500 ring-2 ring-violet-200"
                      : atLimit
                        ? "cursor-not-allowed border-gray-100 opacity-40"
                        : "cursor-pointer border-gray-200 hover:border-gray-300"
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
                  {/* Preview button */}
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

        {/* Upload new */}
        <label
          htmlFor={uploadId}
          className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-3 text-center transition-colors hover:border-violet-400 hover:bg-violet-50/50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
          ) : (
            <ImagePlus className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-xs font-medium text-gray-600">
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
          <p className="text-xs text-violet-600">
            {selected.length} selected
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Generate Creative</h1>
        <p className="text-sm text-gray-500">
          Create AI-powered ad creatives for your clients
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Form */}
        <form onSubmit={handleGenerate}>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-violet-500" />
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
                        <Badge variant="secondary" className="text-xs">
                          {selectedClient.visual_vibe}
                        </Badge>
                      )}
                      {selectedClient.primary_color && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedClient.primary_color}
                        </Badge>
                      )}
                      {selectedClient.heading_font && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedClient.heading_font}
                        </Badge>
                      )}
                      {selectedClient.tone_of_voice && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedClient.tone_of_voice}
                        </Badge>
                      )}
                      {selectedClient.industry && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedClient.industry}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline">
                    Headline{" "}
                    <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Summer Sale - 50% Off Everything"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad_copy">
                    Ad Copy / Brief{" "}
                    <span className="text-gray-400">(optional)</span>
                  </Label>
                  <Textarea
                    id="ad_copy"
                    value={adCopy}
                    onChange={(e) => setAdCopy(e.target.value)}
                    placeholder="Describe what should be in the image. Include any specific elements, mood, or style directions..."
                    rows={3}
                  />
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
                            ? "bg-violet-600 hover:bg-violet-700"
                            : ""
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-violet-500" />
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
                  {/* Logos */}
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

                  <div className="border-t" />

                  {/* Creative References */}
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

                  <div className="border-t" />

                  {/* Landing Page References */}
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
              className="w-full bg-violet-600 hover:bg-violet-700"
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
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Generation Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {results.map((result, i) => (
                      <div
                        key={result.creativeId}
                        className="flex items-center justify-between rounded-lg border p-3"
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
                              ? "bg-emerald-100 text-emerald-700"
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
                  <Card key={result.creativeId} className="overflow-hidden">
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
                              className="w-full"
                            >
                              <Download className="mr-2 h-3.5 w-3.5" />
                              Download
                            </Button>
                          </a>
                        </CardContent>
                      </>
                    ) : result.status === "failed" ? (
                      <CardContent className="flex aspect-square flex-col items-center justify-center">
                        <XCircle className="mb-2 h-8 w-8 text-red-300" />
                        <p className="text-sm text-red-500">
                          Generation failed
                        </p>
                      </CardContent>
                    ) : (
                      <CardContent className="flex aspect-square flex-col items-center justify-center">
                        <Loader2 className="mb-2 h-8 w-8 animate-spin text-violet-400" />
                        <p className="text-sm text-gray-500">
                          {getStatusLabel(result.status)}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {/* Prompt Used */}
              {promptUsed && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-gray-500">
                      Prompt Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed text-gray-600">
                      {promptUsed}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {results.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="mb-4 rounded-full bg-violet-100 p-4">
                  <Wand2 className="h-8 w-8 text-violet-500" />
                </div>
                <h3 className="mb-1 font-medium text-gray-900">
                  Ready to create
                </h3>
                <p className="text-center text-sm text-gray-500">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -right-3 -top-3 z-10 rounded-full bg-white p-1.5 shadow-lg transition-colors hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-700" />
            </button>
            <img
              src={previewUrl}
              alt="Preview"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
