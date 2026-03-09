import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createTask } from "@/lib/kie-ai";
import { buildPrompt } from "@/lib/prompt-builder";
import type { GenerateRequest } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { client_id, headline, ad_copy, platform, aspect_ratio, num_variations, logo_urls, creative_ref_urls, lp_ref_urls } = body;

    if (!client_id || !platform || !aspect_ratio) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch client details for prompt building
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Create campaign record
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        client_id,
        headline: headline || null,
        ad_copy: ad_copy || null,
        platform,
        aspect_ratio,
      })
      .select()
      .single();

    if (campaignError) {
      return NextResponse.json(
        { error: "Failed to create campaign: " + campaignError.message },
        { status: 500 }
      );
    }

    // Collect categorized reference images
    const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
    const isImageUrl = (url: string) => {
      const lower = url.toLowerCase().split("?")[0];
      return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    };

    const selectedLogos = (logo_urls || []).filter(isImageUrl);
    const selectedCreativeRefs = (creative_ref_urls || []).filter(isImageUrl);
    const selectedLpRefs = (lp_ref_urls || []).filter(isImageUrl);
    const hasUserSelectedAssets = selectedLogos.length > 0 || selectedCreativeRefs.length > 0 || selectedLpRefs.length > 0;

    // Build asset context for prompt
    const assetContext = hasUserSelectedAssets
      ? {
          logoCount: selectedLogos.length,
          creativeRefCount: selectedCreativeRefs.length,
          lpRefCount: selectedLpRefs.length,
        }
      : undefined;

    // Build prompt from client brand info + brief
    const prompt = buildPrompt(client, headline || "", ad_copy || "", platform, assetContext);

    // Collect image inputs (max 8)
    const imageInput: string[] = [];

    if (hasUserSelectedAssets) {
      for (const url of [...selectedLogos, ...selectedCreativeRefs, ...selectedLpRefs]) {
        if (imageInput.length >= 8) break;
        imageInput.push(url);
      }
    } else {
      // Fallback: auto-collect all client images
      if (client.logo_url && isImageUrl(client.logo_url)) {
        imageInput.push(client.logo_url);
      }
      if (client.brand_book_url && isImageUrl(client.brand_book_url)) {
        imageInput.push(client.brand_book_url);
      }
      if (client.assets_data) {
        const allAssets = [
          ...(client.assets_data.logos || []),
          ...(client.assets_data.creatives_reference || []),
          ...(client.assets_data.landing_pages_reference || []),
        ];
        for (const asset of allAssets) {
          if (imageInput.length >= 8) break;
          if (isImageUrl(asset)) imageInput.push(asset);
        }
      }
    }

    // Create tasks for each variation
    const variations = Math.min(Math.max(num_variations || 1, 1), 4);
    const results = [];

    for (let i = 0; i < variations; i++) {
      try {
        const taskResponse = await createTask({
          prompt,
          aspect_ratio,
          image_input: imageInput.length > 0 ? imageInput : undefined,
          resolution: "1K",
          output_format: "png",
        });

        const { data: creative, error: creativeError } = await supabase
          .from("creatives")
          .insert({
            campaign_id: campaign.id,
            client_id,
            prompt_used: prompt,
            status: "generating",
            task_id: taskResponse.data.taskId,
          })
          .select()
          .single();

        if (creativeError) {
          console.error("Failed to insert creative:", creativeError);
          continue;
        }

        results.push({
          creativeId: creative.id,
          taskId: taskResponse.data.taskId,
        });

        // Small delay between API calls to be safe with rate limits
        if (i < variations - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (err) {
        console.error(`Failed to create task variation ${i + 1}:`, err);
      }
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "Failed to create any generation tasks" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campaignId: campaign.id,
      prompt,
      results,
    });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
