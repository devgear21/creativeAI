import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://koytdecufywudrbmplql.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtveXRkZWN1Znl3dWRyYm1wbHFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjY3ODIyOSwiZXhwIjoyMDg4MjU0MjI5fQ.gui6Axh7MAnGIylAc_47onoAxnlSFWSA5I3Mg4o_tls'
);

const columns = [
    'brand_description',
    'target_audience',
    'visual_vibe',
    'primary_color',
    'secondary_color',
    'other_colors',
    'gradient_variations',
    'heading_font',
    'body_font',
    'style_font',
    'imagery_style',
    'what_to_avoid',
    'dos_and_donts',
];

async function run() {
    for (const col of columns) {
        const sql = `ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col} TEXT;`;
        const { data, error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
            console.log(`Column ${col}: trying direct SQL...`);
        } else {
            console.log(`Column ${col}: added successfully`);
        }
    }

    // Verify by trying to read a client with the new columns
    const { data, error } = await supabase
        .from('clients')
        .select('id, brand_description, body_font')
        .limit(1);

    if (error) {
        console.log('\nVerification FAILED:', error.message);
        console.log('\n=== You need to run the migration manually ===');
        console.log('Go to: https://supabase.com/dashboard/project/koytdecufywudrbmplql/sql');
        console.log('Paste the contents of brand-fields-migration.sql and click Run');
    } else {
        console.log('\nVerification PASSED! Columns exist:', Object.keys(data[0] || {}));
    }
}

run().catch(console.error);
