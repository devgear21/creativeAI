import type { Client, Platform, CreativeStyle, TextPosition } from "@/types";

// ─── Platform Style Labels ───────────────────────────────────────────────────

const PLATFORM_STYLES: Record<Platform, string> = {
  instagram:
    "Format: Instagram ad. Vibrant, eye-catching, modern. Clean layout for feed post.",
  facebook:
    "Format: Facebook ad. Professional, engaging. Clear focal point for news feed.",
  linkedin:
    "Format: LinkedIn ad. Corporate, polished, trustworthy. Business-appropriate.",
  twitter:
    "Format: Twitter/X ad. Bold, attention-grabbing. Works at small sizes.",
};

// ─── Asset Context ───────────────────────────────────────────────────────────

export interface AssetContext {
  logoCount: number;
  creativeRefCount: number;
  lpRefCount: number;
}

// ─── Text Position Mapping ───────────────────────────────────────────────────

const POSITION_INSTRUCTIONS: Record<TextPosition, string> = {
  default: "positioned where it naturally fits the composition",
  top: "positioned at the TOP of the image",
  middle: "positioned in the CENTER/MIDDLE of the image",
  bottom: "positioned at the BOTTOM of the image",
  left: "positioned on the LEFT SIDE of the image",
  right: "positioned on the RIGHT SIDE of the image",
};

// ─── Shared Prompt Sections (private helpers) ──────────────────────────────

function buildBrandSection(client: Client): string[] {
  const parts: string[] = [];

  parts.push(
    `Create a high-end advertising image for "${client.name}".`
  );

  if (client.brand_description) {
    parts.push(`Brand context: ${client.brand_description}.`);
  } else if (client.industry) {
    parts.push(`Industry: ${client.industry}.`);
  }

  if (client.target_audience) {
    parts.push(`Target audience: ${client.target_audience}.`);
  }

  return parts;
}

function buildVisualVibeSection(client: Client): string[] {
  const parts: string[] = [];

  if (client.visual_vibe) {
    parts.push(`Visual mood/vibe: ${client.visual_vibe}.`);
  }

  return parts;
}

function buildColorSection(client: Client): string[] {
  const parts: string[] = [];
  const colorParts: string[] = [];

  if (client.primary_color) colorParts.push(`primary: ${client.primary_color}`);
  if (client.secondary_color) colorParts.push(`secondary: ${client.secondary_color}`);
  if (client.other_colors) colorParts.push(`accents: ${client.other_colors}`);

  if (colorParts.length > 0) {
    parts.push(`Brand colors — ${colorParts.join(", ")}. Use these prominently.`);
  } else if (client.brand_colors) {
    parts.push(`Brand colors: ${client.brand_colors}. Use these prominently.`);
  }

  if (client.gradient_variations) {
    parts.push(`Gradients: ${client.gradient_variations}.`);
  }

  return parts;
}

function buildFontSection(client: Client): string[] {
  const parts: string[] = [];
  const fontParts: string[] = [];

  if (client.heading_font) fontParts.push(`heading: ${client.heading_font}`);
  if (client.body_font) fontParts.push(`body: ${client.body_font}`);
  if (client.style_font) fontParts.push(`accent: ${client.style_font}`);

  if (fontParts.length > 0) {
    parts.push(`Typography: ${fontParts.join(", ")}.`);
  } else if (client.font_style) {
    parts.push(`Typography style: ${client.font_style}.`);
  }

  return parts;
}

function buildImagerySection(client: Client): string[] {
  const parts: string[] = [];

  if (client.imagery_style) {
    parts.push(`Imagery style: ${client.imagery_style}.`);
  } else if (client.tone_of_voice) {
    parts.push(`Visual tone: ${client.tone_of_voice.toLowerCase()}.`);
  }

  return parts;
}

function buildConstraintsSection(client: Client): string[] {
  const parts: string[] = [];

  if (client.what_to_avoid) {
    parts.push(`AVOID: ${client.what_to_avoid}.`);
  }

  if (client.dos_and_donts) {
    parts.push(`Rules: ${client.dos_and_donts}.`);
  }

  return parts;
}

function buildCreativeDirectionSection(creativeDirection?: string): string[] {
  if (!creativeDirection || !creativeDirection.trim()) return [];
  return [
    `CREATIVE DIRECTION: ${creativeDirection.trim()}. Follow this reference/direction closely when designing the ad — adapt the visual style, layout approach, or UI patterns described above into the brand's creative.`
  ];
}

function buildCommonSections(client: Client, platform: Platform): string[] {
  return [
    ...buildBrandSection(client),
    PLATFORM_STYLES[platform],
    ...buildVisualVibeSection(client),
    ...buildColorSection(client),
    ...buildFontSection(client),
    ...buildImagerySection(client),
    ...buildConstraintsSection(client),
  ];
}

// ─── Product Reference Section ───────────────────────────────────────────────

function buildProductReferenceSection(client: Client, assetContext?: AssetContext): string[] {
  const parts: string[] = [];

  if (assetContext && (assetContext.logoCount > 0 || assetContext.creativeRefCount > 0 || assetContext.lpRefCount > 0)) {
    parts.push(
      `CRITICAL — Reference images are attached. You MUST base your output on these references. Do NOT ignore them. Do NOT invent new subjects.`
    );

    if (assetContext.logoCount > 0) {
      parts.push(
        `LOGO (${assetContext.logoCount}): The brand's logo is included. Incorporate it cleanly into the design. Keep it recognizable — do NOT redraw it.`
      );
    }

    if (assetContext.creativeRefCount > 0) {
      parts.push(
        `CREATIVE REFERENCES (${assetContext.creativeRefCount}): These show the brand's ACTUAL products and existing creative style. ` +
        `MANDATORY: Match the exact same product type, packaging, shape, and appearance shown in these references. ` +
        `Match the same photographic style — the same lighting direction, color grading, depth of field, and background treatment. ` +
        `Match the same composition approach — how the product is staged, the camera angle, and the spatial layout. ` +
        `Create a fresh variation that looks like the NEXT ad in the same campaign — same product, same style, different angle or arrangement. ` +
        `Do NOT invent a different product. Do NOT change the product category. Do NOT use generic stock imagery. The product in the output MUST look like the same product from the references.`
      );
    }

    if (assetContext.lpRefCount > 0) {
      parts.push(
        `LANDING PAGE REFERENCES (${assetContext.lpRefCount}): Match the same color treatment, visual language, and overall tone as the brand's website.`
      );
    }

    parts.push(
      `FINAL CHECK: The output must look like it belongs to the exact same brand and campaign as the reference images. Same product, same style, fresh composition.`
    );
  } else {
    const assetCount =
      (client.assets_data?.logos?.length || 0) +
      (client.assets_data?.creatives_reference?.length || 0) +
      (client.assets_data?.landing_pages_reference?.length || 0);
    const hasReferenceImages =
      client.logo_url ||
      client.brand_book_url ||
      assetCount > 0;

    if (hasReferenceImages) {
      const refParts: string[] = [];
      if (client.logo_url) refParts.push("logo");
      if (client.brand_book_url) refParts.push("brand book");
      if (assetCount > 0) refParts.push(`${assetCount} asset(s)`);

      parts.push(
        `Reference images provided: ${refParts.join(", ")}. ` +
        `MANDATORY: Study these carefully. Match the exact product appearance, photography style, color grading, and composition approach. ` +
        `Create a new ad that features the SAME product with the SAME style — only vary the composition. Do NOT invent a different product or use generic imagery.`
      );
    }
  }

  return parts;
}

// ─── Service Reference Section ───────────────────────────────────────────────

function buildServiceReferenceSection(client: Client, assetContext?: AssetContext): string[] {
  const parts: string[] = [];

  if (assetContext && (assetContext.logoCount > 0 || assetContext.creativeRefCount > 0 || assetContext.lpRefCount > 0)) {
    parts.push(
      `CRITICAL — Reference images are attached. You MUST base your output on these references. Do NOT ignore them. Do NOT invent new subjects.`
    );

    if (assetContext.logoCount > 0) {
      parts.push(
        `LOGO (${assetContext.logoCount}): The brand's logo is included. Incorporate it cleanly into the design. Keep it recognizable — do NOT redraw it.`
      );
    }

    if (assetContext.creativeRefCount > 0) {
      parts.push(
        `CREATIVE REFERENCES (${assetContext.creativeRefCount}): This is a SERVICE brand — the references show the brand's real-world scenes, people, settings, equipment, or work environment. ` +
        `MANDATORY: USE the actual visual elements from these references as the core imagery. ` +
        `Replicate the exact same type of scene, setting, and subjects shown in the references. ` +
        `Match the same photographic style — lighting, color grading, depth of field, and atmosphere. ` +
        `You may recompose for ad layout, but the subjects, environment, and visual feel MUST come from the references. ` +
        `Do NOT replace them with generic stock imagery. Do NOT invent different scenes. The output must look like it was shot in the same location/context as the references.`
      );
    }

    if (assetContext.lpRefCount > 0) {
      parts.push(
        `LANDING PAGE REFERENCES (${assetContext.lpRefCount}): Match the same color treatment, visual language, and overall tone as the brand's website.`
      );
    }

    parts.push(
      `FINAL CHECK: The output must feature the REAL scenes and subjects from the references in a polished ad layout. Do NOT substitute with generic or AI-hallucinated imagery.`
    );
  } else {
    const assetCount =
      (client.assets_data?.logos?.length || 0) +
      (client.assets_data?.creatives_reference?.length || 0) +
      (client.assets_data?.landing_pages_reference?.length || 0);
    const hasReferenceImages =
      client.logo_url ||
      client.brand_book_url ||
      assetCount > 0;

    if (hasReferenceImages) {
      const refParts: string[] = [];
      if (client.logo_url) refParts.push("logo");
      if (client.brand_book_url) refParts.push("brand book");
      if (assetCount > 0) refParts.push(`${assetCount} asset(s)`);

      parts.push(
        `Reference images provided: ${refParts.join(", ")}. ` +
        `This is a service brand — USE the actual scenes, settings, and subjects from the references as core imagery. ` +
        `Match the photographic style, color grading, and atmosphere exactly. Do NOT replace with generic imagery.`
      );
    }
  }

  return parts;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. PRODUCT + WITH TEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildProductTextPrompt(
  client: Client,
  headline: string,
  adCopy: string,
  platform: Platform,
  assetContext?: AssetContext,
  headlinePosition?: TextPosition,
  adCopyPosition?: TextPosition,
  creativeDirection?: string
): string {
  const parts: string[] = [...buildCommonSections(client, platform)];

  // Ad content — text with positioning
  if (headline && headline.trim()) {
    const pos = headlinePosition && headlinePosition !== "default"
      ? `, ${POSITION_INSTRUCTIONS[headlinePosition]}`
      : "";
    parts.push(
      `HEADLINE TEXT: "${headline.trim()}" — render this text prominently and legibly in the design${pos}. Use a bold, clean typeface that contrasts well against the background.`
    );
  }
  if (adCopy && adCopy.trim()) {
    const pos = adCopyPosition && adCopyPosition !== "default"
      ? `, ${POSITION_INSTRUCTIONS[adCopyPosition]}`
      : "";
    parts.push(
      `BODY COPY: "${adCopy.trim()}" — include this as secondary text in the design${pos}. Keep it readable and smaller than the headline.`
    );
  }

  // Product-based reference handling
  parts.push(...buildProductReferenceSection(client, assetContext));

  // Creative direction
  parts.push(...buildCreativeDirectionSection(creativeDirection));

  // Closing
  parts.push(
    "High quality, photorealistic, commercial-grade ad. No watermarks. Text must be sharp, legible, and well-integrated into the layout."
  );

  return parts.join(" ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. PRODUCT + VISUALS ONLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildProductVisualPrompt(
  client: Client,
  platform: Platform,
  assetContext?: AssetContext,
  creativeDirection?: string
): string {
  const parts: string[] = [...buildCommonSections(client, platform)];

  // Visual-only instruction
  parts.push(
    `VISUAL-ONLY creative — absolutely NO text, headlines, taglines, captions, letters, numbers, or typographic elements anywhere in the image. ` +
    `Pure product photography/visual composition. Showcase the product in an aspirational, editorial-quality setting that matches the brand aesthetic from the references.`
  );

  // Product-based reference handling
  parts.push(...buildProductReferenceSection(client, assetContext));

  // Creative direction
  parts.push(...buildCreativeDirectionSection(creativeDirection));

  // Closing
  parts.push(
    "High quality, photorealistic, commercial-grade. ZERO text or watermarks anywhere. Clean product-focused visual."
  );

  return parts.join(" ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. SERVICE + WITH TEXT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildServiceTextPrompt(
  client: Client,
  headline: string,
  adCopy: string,
  platform: Platform,
  assetContext?: AssetContext,
  headlinePosition?: TextPosition,
  adCopyPosition?: TextPosition,
  creativeDirection?: string
): string {
  const parts: string[] = [...buildCommonSections(client, platform)];

  // Ad content — text with positioning
  if (headline && headline.trim()) {
    const pos = headlinePosition && headlinePosition !== "default"
      ? `, ${POSITION_INSTRUCTIONS[headlinePosition]}`
      : "";
    parts.push(
      `HEADLINE TEXT: "${headline.trim()}" — render this text prominently and legibly in the design${pos}. Use a bold, clean typeface that contrasts well against the background.`
    );
  }
  if (adCopy && adCopy.trim()) {
    const pos = adCopyPosition && adCopyPosition !== "default"
      ? `, ${POSITION_INSTRUCTIONS[adCopyPosition]}`
      : "";
    parts.push(
      `BODY COPY: "${adCopy.trim()}" — include this as secondary text in the design${pos}. Keep it readable and smaller than the headline.`
    );
  }

  // Service-specific context
  parts.push(
    `SERVICE BRAND: Feature real-world scenes, people, or environments representing this service. The ad should feel authentic and relatable, not abstract.`
  );

  // Service-based reference handling
  parts.push(...buildServiceReferenceSection(client, assetContext));

  // Creative direction
  parts.push(...buildCreativeDirectionSection(creativeDirection));

  // Closing
  parts.push(
    "High quality, photorealistic, commercial-grade ad. No watermarks. Text must be sharp, legible, and well-integrated into the layout."
  );

  return parts.join(" ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. SERVICE + VISUALS ONLY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildServiceVisualPrompt(
  client: Client,
  platform: Platform,
  assetContext?: AssetContext,
  creativeDirection?: string
): string {
  const parts: string[] = [...buildCommonSections(client, platform)];

  // Visual-only instruction
  parts.push(
    `VISUAL-ONLY creative — absolutely NO text, headlines, taglines, captions, letters, numbers, or typographic elements anywhere in the image. ` +
    `Pure photographic composition showing the service in action.`
  );

  // Service-specific context
  parts.push(
    `SERVICE BRAND: Feature real-world scenes, people, or environments representing this service. ` +
    `Use the actual subjects and settings from the reference images. The visual must feel authentic, not generic stock photography.`
  );

  // Service-based reference handling
  parts.push(...buildServiceReferenceSection(client, assetContext));

  // Creative direction
  parts.push(...buildCreativeDirectionSection(creativeDirection));

  // Closing
  parts.push(
    "High quality, photorealistic, commercial-grade. ZERO text or watermarks anywhere. Authentic service-focused visual."
  );

  return parts.join(" ");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ROUTER — thin dispatcher that reads client_type + creative_style
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function buildPrompt(
  client: Client,
  headline: string,
  adCopy: string,
  platform: Platform,
  assetContext?: AssetContext,
  creativeStyle?: CreativeStyle,
  headlinePosition?: TextPosition,
  adCopyPosition?: TextPosition,
  creativeDirection?: string
): string {
  const clientType = client.client_type || "product";
  const style: CreativeStyle = creativeStyle || "with_text";

  if (clientType === "product" && style === "with_text") {
    return buildProductTextPrompt(client, headline, adCopy, platform, assetContext, headlinePosition, adCopyPosition, creativeDirection);
  }

  if (clientType === "product" && style === "visuals_only") {
    return buildProductVisualPrompt(client, platform, assetContext, creativeDirection);
  }

  if (clientType === "service" && style === "with_text") {
    return buildServiceTextPrompt(client, headline, adCopy, platform, assetContext, headlinePosition, adCopyPosition, creativeDirection);
  }

  if (clientType === "service" && style === "visuals_only") {
    return buildServiceVisualPrompt(client, platform, assetContext, creativeDirection);
  }

  // Fallback
  return buildProductTextPrompt(client, headline, adCopy, platform, assetContext, headlinePosition, adCopyPosition, creativeDirection);
}
