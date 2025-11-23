import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CompletionPayload {
  applicantEmail: string;
  applicantName: string;
  title: string;
  referenceNumber: string;
  category: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: CompletionPayload = await req.json();
    const { applicantEmail, applicantName, title, referenceNumber, category } = payload;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          h1 { margin: 0; font-size: 24px; }
          h2 { color: #667eea; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 IP Registration Completed!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${applicantName}</strong>,</p>
            
            <p>Congratulations! Your intellectual property registration has been successfully completed and is now ready for IPO Philippines filing.</p>
            
            <div class="highlight">
              <h2>Submission Details</h2>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>Reference Number:</strong> ${referenceNumber}</p>
              <p><strong>Category:</strong> ${category.charAt(0).toUpperCase() + category.slice(1)}</p>
              <p><strong>Status:</strong> Ready for IPO Philippines Filing</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Request your official IP registration certificate through the system</li>
              <li>Review your completed documentation</li>
              <li>Prepare for IPO Philippines submission</li>
            </ol>
            
            <p>You can now request your official certificate from your dashboard. The certificate will serve as proof of your IP registration with the University of Caloocan City.</p>
            
            <div style="text-align: center;">
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://your-app-url.com'}/dashboard" class="button">View Your Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact the UCC IP Office.</p>
            
            <div class="footer">
              <p>University of Caloocan City<br>Intellectual Property Office</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'UCC IP Office <onboarding@resend.dev>',
        to: [applicantEmail],
        subject: `🎉 IP Registration Completed - ${referenceNumber}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email service unavailable',
          details: error
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-completion-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});