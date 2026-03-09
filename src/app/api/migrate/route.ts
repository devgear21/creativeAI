import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// This endpoint adds the brand document columns to the clients table.
// It is safe to call multiple times (uses ADD COLUMN IF NOT EXISTS).
export async function POST() {
    try {
        const supabase = createServerClient();

        const columns = [
            "brand_description",
            "target_audience",
            "visual_vibe",
            "primary_color",
            "secondary_color",
            "other_colors",
            "gradient_variations",
            "heading_font",
            "body_font",
            "style_font",
            "imagery_style",
            "what_to_avoid",
            "dos_and_donts",
        ];

        // Try to read a column to see if migration already ran
        const { error: testError } = await supabase
            .from("clients")
            .select("brand_description")
            .limit(1);

        if (!testError) {
            return NextResponse.json({
                status: "already_migrated",
                message: "All brand columns already exist.",
            });
        }

        // Columns don't exist yet — we need to add them.
        // Since Supabase PostgREST doesn't support raw DDL,
        // we use the postgres-meta API that ships with every Supabase project.
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        const sql = `
      ALTER TABLE clients
        ${columns.map((c) => `ADD COLUMN IF NOT EXISTS ${c} TEXT`).join(",\n        ")};
    `;

        // Use the /pg/query endpoint available on Supabase instances
        const pgRes = await fetch(`${supabaseUrl}/pg/query`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apikey: serviceKey,
                Authorization: `Bearer ${serviceKey}`,
                "X-Supabase-Service-Role": serviceKey,
            },
            body: JSON.stringify({ query: sql }),
        });

        if (!pgRes.ok) {
            // Fallback: try /rest/v1/rpc endpoint (some projects expose this)
            const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                },
                body: JSON.stringify({ query: sql }),
            });

            if (!rpcRes.ok) {
                return NextResponse.json(
                    {
                        status: "manual_required",
                        message:
                            "Could not run migration automatically. Please run the SQL in the Supabase SQL Editor.",
                        sql,
                    },
                    { status: 422 }
                );
            }
        }

        // Verify migration worked
        const { error: verifyError } = await supabase
            .from("clients")
            .select("brand_description")
            .limit(1);

        if (verifyError) {
            // PostgREST cache might be stale — call schema reload
            await fetch(`${supabaseUrl}/rest/v1/`, {
                method: "GET",
                headers: {
                    apikey: serviceKey,
                    Authorization: `Bearer ${serviceKey}`,
                    Accept: "application/json",
                },
            });

            return NextResponse.json({
                status: "migrated_pending_reload",
                message:
                    "Migration ran but schema cache may need a moment to refresh. Try saving again in a few seconds.",
            });
        }

        return NextResponse.json({
            status: "migrated",
            message: "Brand columns added successfully!",
        });
    } catch (err) {
        console.error("Migration error:", err);
        return NextResponse.json(
            { error: "Migration failed: " + (err instanceof Error ? err.message : String(err)) },
            { status: 500 }
        );
    }
}
