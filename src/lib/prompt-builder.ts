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
  const hasTextContent = !!(headline && headline.trim()) || !!(adCopy && adCopy.trim());

  if (headline && headline.trim()) {
    parts.push(`The ad headline is: "${headline.trim()}". Include this text prominently in the design.`);
  }

  if (adCopy && adCopy.trim()) {
    parts.push(`The ad communicates: ${adCopy.trim()}`);
  }

  if (!hasTextContent) {
    parts.push(
      `This is a VISUAL-ONLY creative — do NOT include any text, headlines, taglines, captions, or typographic elements in the image. ` +
      `The output should be a pure visual/photographic composition that communicates the brand identity through imagery, color, and composition alone.`
    );
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
  // Balance: learn the brand identity & product from references, but create an ORIGINAL new ad.
  // Do NOT copy/clone the references. Do NOT ignore them and invent from scratch.
  if (assetContext && (assetContext.logoCount > 0 || assetContext.creativeRefCount > 0 || assetContext.lpRefCount > 0)) {
    parts.push(
      `Reference images have been provided with this request. Study them carefully to understand the brand's visual identity, then create a fresh, ORIGINAL advertising composition inspired by them.`
    );

    if (assetContext.logoCount > 0) {
      parts.push(
        `LOGO (${assetContext.logoCount} image${assetContext.logoCount > 1 ? "s" : ""}): The brand's logo is included. Place it naturally in the ad layout. Keep the logo recognizable — do not redraw or heavily alter it.`
      );
    }

    if (assetContext.creativeRefCount > 0) {
      parts.push(
        `CREATIVE REFERENCES (${assetContext.creativeRefCount} image${assetContext.creativeRefCount > 1 ? "s" : ""}): These show the brand's existing ad style and products. ` +
        `Use them to understand what the brand's products look like, the photography style, composition patterns, and overall aesthetic. ` +
        `Create a NEW original ad that feels like it belongs to the same brand campaign — same product category, similar quality and style — but with a fresh composition. ` +
        `Do NOT just copy or recreate these reference images. Do NOT invent a completely different product that doesn't match the brand.`
      );
    }

    if (assetContext.lpRefCount > 0) {
      parts.push(
        `LANDING PAGE REFERENCES (${assetContext.lpRefCount} image${assetContext.lpRefCount > 1 ? "s" : ""}): These show the brand's web presence. Match the overall visual language — color treatment, imagery style, and tone — so the ad feels consistent with the website.`
      );
    }

    parts.push(
      `KEY RULE: The output should be a NEW creative that is clearly on-brand (informed by the references) but NOT a duplicate of any reference image. Think of it as creating the next ad in the same campaign series.`
    );
  } else {
    // Fallback: auto-collected client images
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
        refParts.push("the brand book/guidelines");
      if (assetCount > 0)
        refParts.push(`${assetCount} brand asset(s)`);

      parts.push(
        `Reference images have been provided including ${refParts.join(", ")}. ` +
        `Study them to understand the brand's visual identity, product appearance, and style. ` +
        `Then create a NEW original ad that is clearly on-brand — same product category, similar quality and aesthetic — but with a fresh composition. ` +
        `Do NOT copy the references. Do NOT ignore them and invent something unrelated. Create the next ad in the same campaign family.`
      );
    }
  }

  if (hasTextContent) {
    parts.push(
      "High quality, photorealistic rendering. No watermarks. The text/headline should be integrated cleanly into the design. Suitable for commercial advertising use."
    );
  } else {
    parts.push(
      "High quality, photorealistic rendering. Absolutely no text, words, letters, numbers, or watermarks anywhere in the image. Suitable for commercial advertising use."
    );
  }

  return parts.join(" ");
}
