import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PdfRequest {
  template: string;
  data: Record<string, any>;
  ipRecordId: string;
  qrData?: string;
}

function generateQRCodeDataUrl(data: string): string {
  const qrText = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`;
}

function generatePdfHtml(template: string, data: Record<string, any>, qrCodeUrl: string): string {
  let html = template;
  
  for (const [key, value] of Object.entries(data)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  html = html.replace(/{{qr_data_url}}/g, qrCodeUrl);
  
  const logoDataUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiMyNTYzZWIiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkNDQzwvdGV4dD48L3N2Zz4=';
  html = html.replace(/{{logo_data_url}}/g, logoDataUrl);
  
  return html;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { template, data, ipRecordId, qrData }: PdfRequest = await req.json();

    if (!template || !data || !ipRecordId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template, data, ipRecordId" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const qrCodeData = qrData || `https://ucc-ip.edu/verify/${ipRecordId}`;
    const qrCodeUrl = generateQRCodeDataUrl(qrCodeData);
    
    const pdfHtml = generatePdfHtml(template, data, qrCodeUrl);
    
    const timestamp = new Date().toISOString();
    const fileName = `certificate_${ipRecordId}_${Date.now()}.pdf`;

    console.log(`PDF would be generated for IP Record: ${ipRecordId}`);
    console.log(`File name: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "PDF generation simulated (PDF library not configured)",
        data: {
          fileName,
          qrCode: qrCodeData,
          html: pdfHtml,
          timestamp,
        }
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate PDF" }),
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