import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VerifyCodeRequest {
  email: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, code }: VerifyCodeRequest = await req.json();

    const { data: verificationData, error: fetchError } = await supabase
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .gt("expires_at", new Date().toISOString())
      .eq("verified", false)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!verificationData) {
      throw new Error("Invalid or expired verification code");
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: verificationData.email,
      password: verificationData.password_hash,
      email_confirm: true,
    });

    if (authError) throw authError;

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    const { error: profileError } = await supabase.from("users").insert({
      auth_user_id: authData.user.id,
      email: verificationData.email,
      full_name: verificationData.full_name,
      affiliation: verificationData.affiliation,
      role: "applicant",
      is_verified: true,
    });

    if (profileError) throw profileError;

    await supabase
      .from("verification_codes")
      .update({ verified: true })
      .eq("id", verificationData.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Registration completed successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error verifying code:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});