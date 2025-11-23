import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface StatusNotificationPayload {
  applicantEmail: string;
  applicantName: string;
  recordTitle: string;
  referenceNumber: string;
  oldStatus: string;
  newStatus: string;
  currentStage: string;
  remarks?: string;
  actorName?: string;
  actorRole?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload: StatusNotificationPayload = await req.json();

    const statusMessages: Record<string, { subject: string; message: string }> = {
      submitted: {
        subject: "Submission Received Successfully",
        message: "Thank you for your submission! We have successfully received your intellectual property submission and it will be reviewed shortly.",
      },
      waiting_supervisor: {
        subject: "Submission Under Supervisor Review",
        message: "Your submission is now being reviewed by a supervisor.",
      },
      supervisor_approved: {
        subject: "Supervisor Approved Your Submission",
        message: "Great news! Your submission has been approved by the supervisor and is moving to evaluation.",
      },
      supervisor_revision: {
        subject: "Revision Requested by Supervisor",
        message: "The supervisor has requested revisions to your submission. Please review the feedback and make necessary changes.",
      },
      waiting_evaluation: {
        subject: "Submission In Evaluation",
        message: "Your submission is now being evaluated by our technical team.",
      },
      evaluator_approved: {
        subject: "Evaluation Complete - Approved!",
        message: "Congratulations! Your submission has been approved by the evaluator.",
      },
      evaluator_revision: {
        subject: "Revision Requested by Evaluator",
        message: "The evaluator has requested revisions to your submission. Please review the feedback provided.",
      },
      rejected: {
        subject: "Submission Decision",
        message: "After careful review, your submission has been declined.",
      },
      completed: {
        subject: "Process Completed",
        message: "Your intellectual property submission process has been completed successfully!",
      },
    };

    const statusInfo = statusMessages[payload.newStatus] || {
      subject: "Status Update",
      message: "Your submission status has been updated.",
    };

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${statusInfo.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">UCC IP Office</h1>
        <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 14px;">Intellectual Property Management System</p>
      </div>

      <div style="padding: 30px;">
        <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; font-weight: 600;">${statusInfo.subject}</h2>

        <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
          Dear ${payload.applicantName},
        </p>

        <p style="color: #4b5563; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
          ${statusInfo.message}
        </p>

        <div style="background-color: #f9fafb; border-left: 4px solid #667eea; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; font-weight: 600;">SUBMISSION DETAILS</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">
            <strong>Title:</strong> ${payload.recordTitle}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">
            <strong>Reference:</strong> ${payload.referenceNumber}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1f2937;">
            <strong>Current Stage:</strong> ${payload.currentStage}
          </p>
          ${payload.actorName ? `
          <p style="margin: 0; font-size: 14px; color: #1f2937;">
            <strong>Reviewed By:</strong> ${payload.actorName}${payload.actorRole ? ` (${payload.actorRole})` : ''}
          </p>
          ` : ''}
        </div>

        ${payload.remarks ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #92400e; font-weight: 600;">REMARKS / FEEDBACK</p>
          <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5;">${payload.remarks}</p>
        </div>
        ` : ''}

        <p style="color: #6b7280; margin: 24px 0 0 0; font-size: 14px; line-height: 1.5;">
          This is an automated notification from the UCC IP Office system. Please log in to your account for full details and to take any necessary actions.
        </p>
      </div>

      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; margin: 0; font-size: 12px;">
          © 2025 UCC IP Office. All rights reserved.
        </p>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 12px;">
          University College Cork, Cork, Ireland
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "Email service not configured",
          details: "Contact administrator to configure RESEND_API_KEY"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const emailPayload = {
      from: "UCC IP Office <onboarding@resend.dev>",
      to: [payload.applicantEmail],
      subject: statusInfo.subject,
      html: emailHtml,
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send email");
    }

    console.log('Email sent successfully to:', payload.applicantEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email notification sent to ${payload.applicantEmail}`,
        subject: statusInfo.subject,
        emailId: result.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending status notification:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});