import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getTaskStatus } from "@/lib/kie-ai";

export async function GET(request: NextRequest) {
  try {
    const taskId = request.nextUrl.searchParams.get("taskId");
    const creativeId = request.nextUrl.searchParams.get("creativeId");

    if (!taskId || !creativeId) {
      return NextResponse.json(
        { error: "Missing taskId or creativeId" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if already resolved in DB
    const { data: creative } = await supabase
      .from("creatives")
      .select("*")
      .eq("id", creativeId)
      .single();

    if (creative?.status === "completed") {
      return NextResponse.json({
        status: "completed",
        image_url: creative.image_url,
      });
    }

    if (creative?.status === "failed") {
      return NextResponse.json({ status: "failed" });
    }

    // Poll Kie.ai for current status
    const taskResult = await getTaskStatus(taskId);
    const state = taskResult.data.state;

    if (state === "success") {
      // Parse result URLs from the task response
      const resultData = JSON.parse(taskResult.data.resultJson);
      const tempImageUrl = resultData.resultUrls[0];

      // Download the image from Kie.ai temporary URL
      const imageResponse = await fetch(tempImageUrl);
      if (!imageResponse.ok) {
        await supabase
          .from("creatives")
          .update({ status: "failed" })
          .eq("id", creativeId);
        return NextResponse.json({
          status: "failed",
          error: "Failed to download generated image",
        });
      }

      const imageBuffer = await imageResponse.arrayBuffer();

      // Upload to Supabase Storage permanently
      const fileName = `${creativeId}.png`;
      const { error: uploadError } = await supabase.storage
        .from("creatives")
        .upload(fileName, imageBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        await supabase
          .from("creatives")
          .update({ status: "failed" })
          .eq("id", creativeId);
        return NextResponse.json({
          status: "failed",
          error: "Storage upload failed: " + uploadError.message,
        });
      }

      // Get permanent public URL
      const { data: publicUrlData } = supabase.storage
        .from("creatives")
        .getPublicUrl(fileName);

      // Update creative record as completed
      await supabase
        .from("creatives")
        .update({
          status: "completed",
          image_url: publicUrlData.publicUrl,
        })
        .eq("id", creativeId);

      return NextResponse.json({
        status: "completed",
        image_url: publicUrlData.publicUrl,
      });
    }

    if (state === "fail") {
      await supabase
        .from("creatives")
        .update({ status: "failed" })
        .eq("id", creativeId);

      return NextResponse.json({
        status: "failed",
        error: taskResult.data.failMsg || "Generation failed",
      });
    }

    // Still in progress
    return NextResponse.json({ status: state });
  } catch (err) {
    console.error("Status check error:", err);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
