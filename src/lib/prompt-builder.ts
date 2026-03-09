import type { Client, Platform } from "@/types";

const PLATFORM_STYLES: Record<Platform, string> = {
  instagram:
    "Social media ad for Instagram. Vibrant, eye-catching, modern aesthetic. Clean layout suitable for a square or vertical feed post.",
  facebook:
    "Social media ad for Facebook. Professional yet engaging visual. Suitable for news feed placement with clear focal point.",
  linkedin:
    "Professional advertisement for LinkedIn. Corporate, polished, trustworthy aesthetic. Business-appropriate imagery.",
  twitter:
    "Social media ad for Twitter/X. Bold, attention-grabbing visual. Works well at small sizes in a fast-scrolling feed.",
};

export function buildPrompt(
  client: Client,
  headline: string,
  adCopy: string,
  platform: Platform,
  assetContext?: {
    logoCount: number;
    creativeRefCount: number;
    lpRefCount: number;
  }
): string {
  const parts: string[] = [];

  // --- Brand Identity ---
  parts.push(
    `Create a professional advertising image for the brand "${client.name}".`
  );

  if (client.brand_description) {
    parts.push(`The brand does the following: ${client.brand_description}.`);
  } else if (client.industry) {
    parts.push(`The brand operates in the ${client.industry} industry.`);
  }

  if (client.target_audience) {
    parts.push(
      `The target audience is: ${client.target_audience}. The ad should resonate with this demographic.`
    );
  }

  // --- Ad Content ---
  if (headline) {
    parts.push(`The ad headline is: "${headline}".`);
  }

  if (adCopy) {
    parts.push(`The ad communicates: ${adCopy}`);
  }

  // --- Platform ---
  parts.push(PLATFORM_STYLES[platform]);

  // --- Visual Vibe ---
  if (client.visual_vibe) {
    parts.push(
      `The overall visual vibe should be: ${client.visual_vibe}. Let this guide the mood, composition, and feel of the entire image.`
    );
  }

  // --- Colors ---
  const colorParts: string[] = [];

  if (client.primary_color) {
    colorParts.push(`Primary brand color: ${client.primary_color}`);
  }
  if (client.secondary_color) {
    colorParts.push(`Secondary brand color: ${client.secondary_color}`);
  }
  if (client.other_colors) {
    colorParts.push(`Other brand colors: ${client.other_colors}`);
  }

  if (colorParts.length > 0) {
    parts.push(
      `Use the brand's color palette — ${colorParts.join("; ")}. These colors should be prominent in the design.`
    );
  } else if (client.brand_colors) {
    // Legacy fallback
    const colors = client.brand_colors
      .split(",")
      .map((c) => c.trim())
      .join(", ");
    parts.push(
      `Use the brand's color palette featuring: ${colors}. These colors should be prominent in the design.`
    );
  }

  if (client.gradient_variations) {
    parts.push(
      `Apply gradient variations where appropriate: ${client.gradient_variations}.`
    );
  }

  // --- Fonts / Typography ---
  const fontParts: string[] = [];

  if (client.heading_font) {
    fontParts.push(`Heading font: ${client.heading_font}`);
  }
  if (client.body_font) {
    fontParts.push(`Body font: ${client.body_font}`);
  }
  if (client.style_font) {
    fontParts.push(`Style/accent font: ${client.style_font}`);
  }

  if (fontParts.length > 0) {
    parts.push(
      `The typography direction is: ${fontParts.join("; ")}. The visual style should complement this typographic approach.`
    );
  } else if (client.font_style) {
    // Legacy fallback
    parts.push(
      `The visual style should complement a ${client.font_style} typography approach.`
    );
  }

  // --- Imagery Style ---
  if (client.imagery_style) {
    parts.push(
      `Imagery style direction: ${client.imagery_style}. Follow this guidance for photo/illustration composition, lighting, and texture.`
    );
  } else if (client.tone_of_voice) {
    // Legacy fallback
    parts.push(
      `The visual tone should feel ${client.tone_of_voice.toLowerCase()}.`
    );
  }

  // --- Constraints: What to Avoid ---
  if (client.what_to_avoid) {
    parts.push(
      `IMPORTANT — Avoid the following in the design: ${client.what_to_avoid}.`
    );
  }

  // --- Do's & Don'ts ---
  if (client.dos_and_donts) {
    parts.push(
      `Brand do's and don'ts to follow: ${client.dos_and_donts}.`
    );
  }

  // --- Reference Images ---
  if (assetContext && (assetContext.logoCount > 0 || assetContext.creativeRefCount > 0 || assetContext.lpRefCount > 0)) {
    const refParts: string[] = [];
    if (assetContext.logoCount > 0)
      refParts.push(`${assetContext.logoCount} brand logo(s)`);
    if (assetContext.creativeRefCount > 0)
      refParts.push(`${assetContext.creativeRefCount} creative reference(s) showing the brand's existing ad style`);
    if (assetContext.lpRefCount > 0)
      refParts.push(`${assetContext.lpRefCount} landing page reference(s) for visual consistency with the brand's web presence`);

    parts.push(
      `Reference images have been provided including ${refParts.join(", ")}. ` +
      `Use these as visual direction — match the brand's visual identity, color scheme, style, and overall aesthetic. ` +
      `The generated creative should look like it belongs to the same brand family as the reference materials.`
    );
  } else {
    // Fallback: check client-level assets
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
      if (client.logo_url) refParts.push("the brand logo");
      if (client.brand_book_url)
        refParts.push("the brand book/guidelines document");
      if (assetCount > 0)
        refParts.push(`${assetCount} brand asset(s)`);

      parts.push(
        `Reference images have been provided including ${refParts.join(", ")}. ` +
        `Use these as visual direction — match the brand's visual identity, color scheme, style, and overall aesthetic. ` +
        `The generated creative should look like it belongs to the same brand family as the reference materials.`
      );
    }
  }

  parts.push(
    "High quality, photorealistic rendering. No text or watermarks in the image. Suitable for commercial advertising use."
  );

  return parts.join(" ");
}
