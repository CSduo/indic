import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase = createClient(
  supabaseUrl || "http://placeholder.local",
  supabaseServiceKey || "placeholder",
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export const getPublicSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://placeholder.local",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
    { auth: { autoRefreshToken: true, persistSession: true } }
  );
};

export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "anvikshiki-media";
