import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_BUCKETS = ["logos", "brand-books", "assets", "creatives"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = (formData.get("bucket") as string) || "logos";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const supabase = createServerClient();
    const ext = file.name.split(".").pop() || "bin";
    const fileName = `${uuidv4()}.${ext}`;
    const buffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { error: "Upload failed: " + error.message },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[Upload API Error]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
