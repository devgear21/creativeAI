"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Upload,
  Loader2,
  FileText,
  ImagePlus,
  X,
  CheckCircle2,
  Palette,
  Type,
  Eye,
  ShieldAlert,
  Image as ImageIcon,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Client, ClientAssets } from "@/types";

interface ClientFormProps {
  defaultValues?: Partial<Client>;
  mode: "create" | "edit";
}

export function ClientForm({ defaultValues, mode }: ClientFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [uploadingBrandBook, setUploadingBrandBook] = useState(false);
  const [uploadingLogos, setUploadingLogos] = useState(false);
  const [uploadingCreativesRef, setUploadingCreativesRef] = useState(false);
  const [uploadingLandingPages, setUploadingLandingPages] = useState(false);

  // Core fields
  const [name, setName] = useState(defaultValues?.name || "");
  const [brandBookUrl, setBrandBookUrl] = useState(
    defaultValues?.brand_book_url || ""
  );
  const [brandBookName, setBrandBookName] = useState("");

  // Assets
  const defaultAssets = defaultValues?.assets_data;
  const [logos, setLogos] = useState<string[]>(defaultAssets?.logos || []);
  const [logoNames, setLogoNames] = useState<string[]>([]);
  const [creativesRef, setCreativesRef] = useState<string[]>(defaultAssets?.creatives_reference || []);
  const [creativesRefNames, setCreativesRefNames] = useState<string[]>([]);
  const [landingPages, setLandingPages] = useState<string[]>(defaultAssets?.landing_pages_reference || []);
  const [landingPageNames, setLandingPageNames] = useState<string[]>([]);

  // Brand Identity
  const [brandDescription, setBrandDescription] = useState(
    defaultValues?.brand_description || ""
  );
  const [targetAudience, setTargetAudience] = useState(
    defaultValues?.target_audience || ""
  );
  const [visualVibe, setVisualVibe] = useState(
    defaultValues?.visual_vibe || ""
  );

  // Colors
  const [primaryColor, setPrimaryColor] = useState(
    defaultValues?.primary_color || ""
  );
  const [secondaryColor, setSecondaryColor] = useState(
    defaultValues?.secondary_color || ""
  );
  const [otherColors, setOtherColors] = useState(
    defaultValues?.other_colors || ""
  );
  const [gradientVariations, setGradientVariations] = useState(
    defaultValues?.gradient_variations || ""
  );

  // Fonts
  const [headingFont, setHeadingFont] = useState(
    defaultValues?.heading_font || ""
  );
  const [bodyFont, setBodyFont] = useState(defaultValues?.body_font || "");
  const [styleFont, setStyleFont] = useState(defaultValues?.style_font || "");

  // Visual Direction
  const [imageryStyle, setImageryStyle] = useState(
    defaultValues?.imagery_style || ""
  );
  const [whatToAvoid, setWhatToAvoid] = useState(
    defaultValues?.what_to_avoid || ""
  );
  const [dosAndDonts, setDosAndDonts] = useState(
    defaultValues?.dos_and_donts || ""
  );

  async function uploadFile(
    file: File,
    bucket: string
  ): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);
    return data.url;
  }

  async function handleBrandBookUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBrandBook(true);
    try {
      const url = await uploadFile(file, "brand-books");
      if (url) {
        setBrandBookUrl(url);
        setBrandBookName(file.name);
        toast.success("Brand book uploaded");
      }
    } catch {
      toast.error("Failed to upload brand book");
    } finally {
      setUploadingBrandBook(false);
    }
  }

  async function handleMultiUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setUrls: React.Dispatch<React.SetStateAction<string[]>>,
    setNames: React.Dispatch<React.SetStateAction<string[]>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
    label: string
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newUrls: string[] = [];
      const newNames: string[] = [];

      for (const file of Array.from(files)) {
        const url = await uploadFile(file, "assets");
        if (url) {
          newUrls.push(url);
          newNames.push(file.name);
        }
      }

      setUrls((prev) => [...prev, ...newUrls]);
      setNames((prev) => [...prev, ...newNames]);
      toast.success(
        `${newUrls.length} ${label} uploaded`
      );
    } catch {
      toast.error(`Failed to upload ${label}`);
    } finally {
      setUploading(false);
    }
  }

  function removeFromList(
    index: number,
    setUrls: React.Dispatch<React.SetStateAction<string[]>>,
    setNames: React.Dispatch<React.SetStateAction<string[]>>
  ) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
    setNames((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveClient(payload: Record<string, unknown>) {
    const supabase = createClient();
    if (mode === "create") {
      const { error } = await supabase.from("clients").insert(payload);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", defaultValues!.id!);
      if (error) throw error;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }

    setSaving(true);
    try {
      const assetsData: ClientAssets = {
        logos,
        creatives_reference: creativesRef,
        landing_pages_reference: landingPages,
      };
      const hasAnyAssets =
        logos.length > 0 || creativesRef.length > 0 || landingPages.length > 0;

      const payload: Record<string, unknown> = {
        name: name.trim(),
        brand_book_url: brandBookUrl || null,
        assets_data: hasAnyAssets ? assetsData : null,
      };

      const brandFields: Record<string, string> = {};
      if (brandDescription.trim()) brandFields.brand_description = brandDescription.trim();
      if (targetAudience.trim()) brandFields.target_audience = targetAudience.trim();
      if (visualVibe.trim()) brandFields.visual_vibe = visualVibe.trim();
      if (primaryColor.trim()) brandFields.primary_color = primaryColor.trim();
      if (secondaryColor.trim()) brandFields.secondary_color = secondaryColor.trim();
      if (otherColors.trim()) brandFields.other_colors = otherColors.trim();
      if (gradientVariations.trim()) brandFields.gradient_variations = gradientVariations.trim();
      if (headingFont.trim()) brandFields.heading_font = headingFont.trim();
      if (bodyFont.trim()) brandFields.body_font = bodyFont.trim();
      if (styleFont.trim()) brandFields.style_font = styleFont.trim();
      if (imageryStyle.trim()) brandFields.imagery_style = imageryStyle.trim();
      if (whatToAvoid.trim()) brandFields.what_to_avoid = whatToAvoid.trim();
      if (dosAndDonts.trim()) brandFields.dos_and_donts = dosAndDonts.trim();

      Object.assign(payload, brandFields);

      try {
        await saveClient(payload);
      } catch (err: unknown) {
        const errObj = err as { code?: string; message?: string };
        const errMsg = errObj?.message || (err instanceof Error ? err.message : String(err));
        const errCode = errObj?.code || "";
        if (errCode === "PGRST204" || errMsg.includes("schema cache") || errMsg.includes("Could not find")) {
          toast.info("Setting up brand fields... please wait");
          const migrateRes = await fetch("/api/migrate", { method: "POST" });
          const migrateData = await migrateRes.json();

          if (migrateRes.ok || migrateData.status === "already_migrated") {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              await saveClient(payload);
            } catch {
              await saveClient({
                name: name.trim(),
                brand_book_url: brandBookUrl || null,
                assets_data: hasAnyAssets ? assetsData : null,
              });
              toast.info("Saved without brand fields — migration may still be in progress. Try editing again in a moment.");
              router.push("/clients");
              router.refresh();
              return;
            }
          } else {
            await saveClient({
              name: name.trim(),
              brand_book_url: brandBookUrl || null,
              assets_data: hasAnyAssets ? assetsData : null,
            });
            toast.warning(
              "Saved core info only. Brand fields require a DB migration — check the Supabase SQL Editor."
            );
            router.push("/clients");
            router.refresh();
            return;
          }
        } else {
          throw err;
        }
      }

      toast.success(mode === "create" ? "Client created" : "Client updated");
      router.push("/clients");
      router.refresh();
    } catch {
      toast.error("Failed to save client");
    } finally {
      setSaving(false);
    }
  }

  function AssetUploadSection({
    label,
    description,
    icon: Icon,
    urls,
    names,
    uploading,
    uploadId,
    onUpload,
    onRemove,
  }: {
    label: string;
    description: string;
    icon: React.ElementType;
    urls: string[];
    names: string[];
    uploading: boolean;
    uploadId: string;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemove: (index: number) => void;
  }) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-violet-400" />
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>

        {urls.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {urls.map((url, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-xl border border-border/50"
              >
                <img
                  src={url}
                  alt={names[i] || `${label} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Label
          htmlFor={uploadId}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/50 p-4 text-center transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
          ) : (
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-muted-foreground">
            {uploading ? "Uploading..." : `Upload ${label.toLowerCase()}`}
          </span>
          <span className="text-xs text-muted-foreground/50">
            PNG, JPG, SVG — select multiple files
          </span>
        </Label>
        <input
          id={uploadId}
          type="file"
          accept="image/*,.svg"
          multiple
          className="hidden"
          onChange={onUpload}
          disabled={uploading}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Client Name & Brand Identity */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-violet-500/10 p-1.5">
                <Eye className="h-3.5 w-3.5 text-violet-400" />
              </div>
              Brand Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Client Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand_description">What the Brand Does</Label>
              <Textarea
                id="brand_description"
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                placeholder="e.g. Premium sustainable fashion brand specializing in minimalist streetwear..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_audience">Who It&apos;s For</Label>
              <Textarea
                id="target_audience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Urban millennials aged 25-35 who value sustainability and clean design..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visual_vibe">
                Visual Vibe{" "}
                <span className="text-muted-foreground/50">(3-5 words)</span>
              </Label>
              <Input
                id="visual_vibe"
                value={visualVibe}
                onChange={(e) => setVisualVibe(e.target.value)}
                placeholder="e.g. Clean, Bold, Minimalist, Warm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-violet-500/10 p-1.5">
                <Palette className="h-3.5 w-3.5 text-violet-400" />
              </div>
              Colors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="e.g. #1A1A2E or Deep Navy"
                  />
                  {primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor.trim()) && (
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg border border-border/50"
                      style={{ backgroundColor: primaryColor.trim() }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Brand Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="e.g. #E94560 or Coral"
                  />
                  {secondaryColor && /^#[0-9a-fA-F]{6}$/.test(secondaryColor.trim()) && (
                    <div
                      className="h-10 w-10 shrink-0 rounded-lg border border-border/50"
                      style={{ backgroundColor: secondaryColor.trim() }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="other_colors">
                Other Brand Colors{" "}
                <span className="text-muted-foreground/50">(if applicable)</span>
              </Label>
              <Input
                id="other_colors"
                value={otherColors}
                onChange={(e) => setOtherColors(e.target.value)}
                placeholder="e.g. Light Grey #F5F5F5, Warm Beige #FAF0E6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gradient_variations">Gradient Variations</Label>
              <Textarea
                id="gradient_variations"
                value={gradientVariations}
                onChange={(e) => setGradientVariations(e.target.value)}
                placeholder="e.g. Primary to secondary diagonal gradient, Navy to coral sunrise gradient..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fonts */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-violet-500/10 p-1.5">
                <Type className="h-3.5 w-3.5 text-violet-400" />
              </div>
              Fonts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="heading_font">Heading Font</Label>
                <Input
                  id="heading_font"
                  value={headingFont}
                  onChange={(e) => setHeadingFont(e.target.value)}
                  placeholder="e.g. Montserrat Bold"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body_font">Body Font</Label>
                <Input
                  id="body_font"
                  value={bodyFont}
                  onChange={(e) => setBodyFont(e.target.value)}
                  placeholder="e.g. Inter Regular"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="style_font">
                Style Font{" "}
                <span className="text-muted-foreground/50">(if applicable)</span>
              </Label>
              <Input
                id="style_font"
                value={styleFont}
                onChange={(e) => setStyleFont(e.target.value)}
                placeholder="e.g. Playfair Display Italic — for accents and callouts"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visual Direction */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-violet-500/10 p-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-violet-400" />
              </div>
              Visual Direction &amp; Constraints
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="imagery_style">Imagery Style</Label>
              <Textarea
                id="imagery_style"
                value={imageryStyle}
                onChange={(e) => setImageryStyle(e.target.value)}
                placeholder="e.g. Lifestyle photography with natural lighting, candid moments, warm earth tones..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="what_to_avoid">What to Avoid</Label>
              <Textarea
                id="what_to_avoid"
                value={whatToAvoid}
                onChange={(e) => setWhatToAvoid(e.target.value)}
                placeholder="e.g. No stock-photo feel, no cluttered layouts, avoid neon colors..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dos_and_donts">Do&apos;s &amp; Don&apos;ts</Label>
              <Textarea
                id="dos_and_donts"
                value={dosAndDonts}
                onChange={(e) => setDosAndDonts(e.target.value)}
                placeholder="e.g. DO use ample white space. DO keep text minimal. DON'T use clip art. DON'T overlay text on busy backgrounds..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Brand Book & Assets */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-violet-500/10 p-1.5">
                <FileText className="h-3.5 w-3.5 text-violet-400" />
              </div>
              Brand Book &amp; Assets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Brand Book Upload */}
            <div className="space-y-2">
              <Label>Brand Book</Label>
              <p className="text-xs text-muted-foreground">
                Upload your brand guidelines document (PDF, DOC, or images)
              </p>

              {brandBookUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-emerald-300">
                      {brandBookName || "Brand book uploaded"}
                    </p>
                    <a
                      href={brandBookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400/70 underline"
                    >
                      View file
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setBrandBookUrl("");
                      setBrandBookName("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Label
                  htmlFor="brandbook-upload"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border/50 p-8 text-center transition-colors hover:border-violet-500/30 hover:bg-violet-500/5"
                >
                  {uploadingBrandBook ? (
                    <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                  ) : (
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium text-muted-foreground">
                    {uploadingBrandBook
                      ? "Uploading..."
                      : "Click to upload brand book"}
                  </span>
                  <span className="text-xs text-muted-foreground/50">
                    PDF, DOC, PNG, JPG up to 50MB
                  </span>
                </Label>
              )}
              <input
                id="brandbook-upload"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={handleBrandBookUpload}
                disabled={uploadingBrandBook}
              />
            </div>

            <Separator className="bg-border/30" />

            <AssetUploadSection
              label="Logos"
              description="Upload brand logos and logo variations"
              icon={ImageIcon}
              urls={logos}
              names={logoNames}
              uploading={uploadingLogos}
              uploadId="logos-upload"
              onUpload={(e) =>
                handleMultiUpload(e, setLogos, setLogoNames, setUploadingLogos, "logo(s)")
              }
              onRemove={(i) => removeFromList(i, setLogos, setLogoNames)}
            />

            <Separator className="bg-border/30" />

            <AssetUploadSection
              label="Creatives Reference"
              description="Upload existing creatives or design references for AI to match style"
              icon={ImagePlus}
              urls={creativesRef}
              names={creativesRefNames}
              uploading={uploadingCreativesRef}
              uploadId="creatives-ref-upload"
              onUpload={(e) =>
                handleMultiUpload(e, setCreativesRef, setCreativesRefNames, setUploadingCreativesRef, "creative reference(s)")
              }
              onRemove={(i) => removeFromList(i, setCreativesRef, setCreativesRefNames)}
            />

            <Separator className="bg-border/30" />

            <AssetUploadSection
              label="Landing Pages Reference"
              description="Upload landing page screenshots or mockups for visual consistency"
              icon={Globe}
              urls={landingPages}
              names={landingPageNames}
              uploading={uploadingLandingPages}
              uploadId="landing-pages-upload"
              onUpload={(e) =>
                handleMultiUpload(e, setLandingPages, setLandingPageNames, setUploadingLandingPages, "landing page reference(s)")
              }
              onRemove={(i) => removeFromList(i, setLandingPages, setLandingPageNames)}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="bg-violet-600 shadow-lg shadow-violet-500/20 hover:bg-violet-500"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create Client" : "Save Changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border/50"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
