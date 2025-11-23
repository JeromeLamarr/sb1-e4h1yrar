import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  role: 'applicant' | 'supervisor' | 'evaluator' | 'admin';
  affiliation?: string;
  categorySpecialization?: string;
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

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw new Error("Only admins can create users");
    }

    const { email, fullName, password, role, affiliation, categorySpecialization }: CreateUserRequest = await req.json();

    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }

    if (role === 'evaluator' && !categorySpecialization) {
      throw new Error("Evaluators must have a category specialization");
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      throw createError;
    }

    if (!authData.user) {
      throw new Error("Failed to create auth user");
    }

    const { error: profileError } = await supabaseAdmin.from("users").insert({
      auth_user_id: authData.user.id,
      email,
      full_name: fullName,
      role,
      affiliation: affiliation || null,
      category_specialization: categorySpecialization || null,
      is_verified: true,
      temp_password: false,
    });

    if (profileError) {
      throw profileError;
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: authData.user.id,
      type: "account_created",
      title: "Account Created",
      message: `Your account has been created by an administrator. Your password has been provided to you separately.`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "User created successfully",
        credentials: {
          email,
          password,
          fullName,
          role,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating user:", error);
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