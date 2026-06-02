import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "https://ocwqgvkswqjfbtrkiymw.supabase.co";
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jd3Fndmtzd3FqZmJ0cmtpeW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDkyOTEsImV4cCI6MjA5NTI4NTI5MX0.WmZlF3_xC28znVT-zvbszbFAw9vN8-PUm5sVuHJrbvc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log("Testing supabase.from('assistance_requests').select('*').not('status', 'in', '(done,refused,expired)')...");
  try {
    const { data, error } = await supabase
      .from("assistance_requests")
      .select("*")
      .not("status", "in", "(done,refused,expired)")
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (error) {
      console.error("Query Error:", error);
    } else {
      console.log("Query Success! Data length:", data?.length);
      console.log("Data sample:", data);
    }
  } catch (err) {
    console.error("Execution error:", err);
  }
}

testQuery();
