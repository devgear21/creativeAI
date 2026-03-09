import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createTask } from "@/lib/kie-ai";
import type { ClientAssets } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const { creative_id, aspect_ratio } = await request.json();

    if (!creative_id || !aspect_ratio) {
      return NextResponse.json(
        { error: "Missing creative_id or aspect_ratio" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch the original creative to get its prompt and client
    const { data: original, error: fetchError } = await supabase
      .from("creatives")
      .select("*, client:clients(*)")
      .eq("id", creative_id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json(
        { error: "Creative not found" },
        { status: 404 }
      );
    }

    // Collect brand reference images from the client
    const client = original.client as Record<string, unknown>;
    const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
    const isImageUrl = (url: string) => {
      const lower = url.toLowerCase().split("?")[0];
      return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
    };

    const imageInput: string[] = [];
    if (client?.logo_url && isImageUrl(client.logo_url as string)) {
      imageInput.push(client.logo_url as string);
    }
    if (client?.brand_book_url && isImageUrl(client.brand_book_url as string)) {
      imageInput.push(client.brand_book_url as string);
    }

    // Collect from assets_data (JSONB)
    const assetsData = client?.assets_data as ClientAssets | null;
    if (assetsData) {
      const allAssets = [
        ...(assetsData.logos || []),
        ...(assetsData.creatives_reference || []),
        ...(assetsData.landing_pages_reference || []),
      ];
      for (const asset of allAssets) {
        if (imageInput.length >= 8) break;
        if (isImageUrl(asset)) imageInput.push(asset);
      }
    }

    // Create a new Kie.ai task with the same prompt but new aspect ratio
    const taskResponse = await createTask({
      prompt: original.prompt_used,
      aspect_ratio,
      image_input: imageInput.length > 0 ? imageInput : undefined,
      resolution: "1K",
      output_format: "png",
    });

    // Determine the parent: if original is itself a child, link to its parent
    const parentId = original.parent_creative_id || creative_id;

    // INSERT a new creative row instead of replacing in place
    const { data: newCreative, error: insertError } = await supabase
      .from("creatives")
      .insert({
        campaign_id: original.campaign_id,
        client_id: original.client_id,
        prompt_used: original.prompt_used,
        status: "generating",
        task_id: taskResponse.data.taskId,
        parent_creative_id: parentId,
        aspect_ratio: aspect_ratio,
      })
      .select()
      .single();

    if (insertError || !newCreative) {
      return NextResponse.json(
        { error: "Failed to create resized creative: " + (insertError?.message || "Unknown error") },
        { status: 500 }
      );
    }

    return NextResponse.json({
      creativeId: newCreative.id,
      taskId: taskResponse.data.taskId,
    });
  } catch (err) {
    console.error("Resize error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
