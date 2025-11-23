import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const evaluators = [
  { email: "patent-evaluator@ucc-ipo.com", fullName: "Patent Evaluator", category: "patent", password: "PatentEval2024!" },
  { email: "copyright-evaluator@ucc-ipo.com", fullName: "Copyright Evaluator", category: "copyright", password: "CopyrightEval2024!" },
  { email: "trademark-evaluator@ucc-ipo.com", fullName: "Trademark Evaluator", category: "trademark", password: "TrademarkEval2024!" },
  { email: "design-evaluator@ucc-ipo.com", fullName: "Industrial Design Evaluator", category: "design", password: "DesignEval2024!" },
  { email: "utility-evaluator@ucc-ipo.com", fullName: "Utility Model Evaluator", category: "utility_model", password: "UtilityEval2024!" },
  { email: "other-evaluator@ucc-ipo.com", fullName: "General Evaluator", category: "other", password: "OtherEval2024!" },
];

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

    const results = [];

    for (const evaluator of evaluators) {
      try {
        const { data: existingUser } = await supabase
          .from("users")
          .select("id, email, category_specialization")
          .eq("email", evaluator.email)
          .maybeSingle();

        if (existingUser) {
          await supabase
            .from("users")
            .update({ category_specialization: evaluator.category })
            .eq("id", existingUser.id);

          results.push({
            email: evaluator.email,
            status: "updated",
            message: "Evaluator specialization updated",
          });
        } else {
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: evaluator.email,
            password: evaluator.password,
            email_confirm: true,
          });

          if (authError) {
            if (authError.message.includes("already registered")) {
              const { data: existingAuth } = await supabase.auth.admin.listUsers();
              const existingAuthUser = existingAuth?.users.find(u => u.email === evaluator.email);
              
              if (existingAuthUser) {
                await supabase.from("users").insert({
                  auth_user_id: existingAuthUser.id,
                  email: evaluator.email,
                  full_name: evaluator.fullName,
                  role: "evaluator",
                  category_specialization: evaluator.category,
                  is_verified: true,
                });

                results.push({
                  email: evaluator.email,
                  status: "linked",
                  message: "Linked existing auth user to profile",
                });
              }
            } else {
              throw authError;
            }
          } else if (authData.user) {
            await supabase.from("users").insert({
              auth_user_id: authData.user.id,
              email: evaluator.email,
              full_name: evaluator.fullName,
              role: "evaluator",
              category_specialization: evaluator.category,
              is_verified: true,
            });

            results.push({
              email: evaluator.email,
              status: "created",
              message: "Evaluator account created",
              password: evaluator.password,
            });
          }
        }
      } catch (error) {
        results.push({
          email: evaluator.email,
          status: "error",
          message: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Evaluator initialization complete",
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error initializing evaluators:", error);
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