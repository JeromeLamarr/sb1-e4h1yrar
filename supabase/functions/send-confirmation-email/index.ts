import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SendConfirmationEmailRequest {
  email: string;
  fullName: string;
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

    const { email, fullName }: SendConfirmationEmailRequest = await req.json();

    // Get the user's confirmation token from Supabase
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(u => u.email === email);

    if (!user) {
      throw new Error("User not found");
    }

    // Build confirmation link - user will click this in their email
    const confirmationToken = user.id; // In production, Supabase handles the token
    const confirmationLink = `${supabaseUrl.replace('https://', '')}/auth/v1/verify?type=signup&token=PLACEHOLDER&redirect_to=YOUR_DOMAIN/auth/confirm`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { 
              display: inline-block; 
              background: #667eea; 
              color: white; 
              padding: 15px 40px; 
              text-decoration: none; 
              border-radius: 5px; 
              font-weight: bold;
              margin: 20px 0;
            }
            .button:hover { background: #5568d3; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .security-note { background: #f0f4ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; font-size: 13px; color: #4c51bf; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to UCC IP Management System</h1>
            </div>
            <div class="content">
              <h2>Hello ${fullName},</h2>
              <p>Thank you for registering with the University of Caloocan City IP Management System.</p>
              <p>To activate your account and complete registration, please click the button below:</p>
              
              <center>
                <a href="${confirmationLink}" class="button">Verify My Email</a>
              </center>

              <p><strong>Or copy and paste this link in your browser:</strong></p>
              <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 5px; font-size: 12px;">
                ${confirmationLink}
              </p>

              <div class="security-note">
                <strong>Security Note:</strong> This link will expire in 24 hours. If you did not create this account, please ignore this email or contact support.
              </div>

              <p>After verifying your email, you'll be able to log in and start managing your intellectual property submissions.</p>
            </div>
            <div class="footer">
              <p>University of Caloocan City Intellectual Property Office</p>
              <p>Protecting Innovation, Promoting Excellence</p>
              <p style="font-size: 12px; margin-top: 10px;">This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email via send-notification-email function
    const emailResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-notification-email`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: email,
          subject: "Verify Your Email - UCC IP Management System",
          html: emailHtml,
        }),
      }
    );

    const emailResult = await emailResponse.json();

    if (!emailResult.success) {
      console.error("Email delivery failed:", emailResult.error);
      throw new Error("Failed to send confirmation email");
    }

    console.log(`Confirmation email sent to ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Confirmation email sent successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending confirmation email:", error);
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
