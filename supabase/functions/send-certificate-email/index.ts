import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CertificateEmailPayload {
  applicantEmail: string;
  applicantName: string;
  title: string;
  referenceNumber: string;
  certificateNumber: string;
  certificateUrl: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: CertificateEmailPayload = await req.json();
    const { applicantEmail, applicantName, title, referenceNumber, certificateNumber, certificateUrl } = payload;

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
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          h1 { margin: 0; font-size: 24px; }
          h2 { color: #10b981; margin-top: 0; }
          .certificate-badge { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏆 Your Certificate is Ready!</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${applicantName}</strong>,</p>

            <p>Congratulations! Your official IP registration certificate has been generated and is now available for download.</p>

            <div class="certificate-badge">
              <h2 style="color: white; margin: 0;">Certificate No: ${certificateNumber}</h2>
            </div>

            <div class="highlight">
              <h2>Certificate Details</h2>
              <p><strong>Title:</strong> ${title}</p>
              <p><strong>Reference Number:</strong> ${referenceNumber}</p>
              <p><strong>Certificate Number:</strong> ${certificateNumber}</p>
            </div>

            <p>Your certificate serves as official proof of your intellectual property registration with the University of Caloocan City. Please keep it in a safe place.</p>

            <div style="text-align: center;">
              <a href="${certificateUrl}" class="button" download>📥 Download Certificate</a>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${Deno.env.get('FRONTEND_URL') || 'https://your-app-url.com'}/dashboard" style="color: #10b981; text-decoration: none;">View in Dashboard →</a>
            </div>

            <p style="margin-top: 30px;"><strong>Important Notes:</strong></p>
            <ul>
              <li>This certificate is digitally signed and can be verified</li>
              <li>Keep multiple copies in secure locations</li>
              <li>Present this certificate when filing with IPO Philippines</li>
            </ul>

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
        subject: `🏆 Your IP Certificate is Ready - ${certificateNumber}`,
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
    console.error('Error in send-certificate-email:', error);
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
