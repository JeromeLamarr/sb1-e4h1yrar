import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CertificateData {
  ipRecordId: string;
  applicantName: string;
  title: string;
  category: string;
  referenceNumber: string;
  coCreators?: string;
  evaluationScore?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: adminUser } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();

    if (!adminUser || adminUser.role !== 'admin') {
      throw new Error('Only admins can generate certificates');
    }

    const payload: CertificateData = await req.json();
    const { ipRecordId, applicantName, title, category, referenceNumber, coCreators, evaluationScore } = payload;

    const registrationDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const qrCodeData = `https://verify.ucc-ipo.com/certificate/${referenceNumber}`;

    const certificateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', serif;
      width: 210mm;
      height: 297mm;
      padding: 20mm;
      position: relative;
    }
    .certificate-border {
      border: 3px solid #333;
      padding: 15mm;
      height: 100%;
      position: relative;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin: 5px 0;
    }
    .header h2 {
      font-size: 16pt;
      font-weight: bold;
      margin: 10px 0;
    }
    .title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      margin: 30px 0;
      text-decoration: underline;
    }
    .content {
      margin: 30px 0;
      line-height: 1.8;
      font-size: 11pt;
    }
    .content p {
      margin: 15px 0;
      text-align: justify;
    }
    .recipient-name {
      text-align: center;
      font-size: 24pt;
      font-weight: bold;
      margin: 20px 0;
    }
    .ip-title {
      text-align: center;
      font-size: 16pt;
      font-style: italic;
      margin: 20px 0;
    }
    .details-table {
      margin: 30px auto;
      width: 90%;
    }
    .details-row {
      display: flex;
      margin: 10px 0;
    }
    .details-label {
      font-weight: bold;
      width: 200px;
    }
    .details-value {
      flex: 1;
    }
    .footer-text {
      margin: 30px 0;
      font-size: 10pt;
      line-height: 1.6;
      text-align: justify;
    }
    .signatures {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .signature-block {
      text-align: center;
      width: 30%;
    }
    .signature-line {
      border-top: 2px solid #333;
      margin: 40px 0 5px 0;
    }
    .signature-title {
      font-weight: bold;
      font-size: 10pt;
    }
    .signature-subtitle {
      font-size: 9pt;
      font-style: italic;
    }
    .footer-info {
      position: absolute;
      bottom: 20px;
      left: 20px;
      font-size: 8pt;
    }
    .qr-placeholder {
      position: absolute;
      bottom: 20px;
      right: 20px;
      text-align: center;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <div class="certificate-border">
    <div class="header">
      <h1>REPUBLIC OF THE PHILIPPINES</h1>
      <h1>UNIVERSITY OF CALOOCAN CITY</h1>
      <h2>INTELLECTUAL PROPERTY OFFICE</h2>
    </div>
    
    <div class="title">CERTIFICATE OF INTELLECTUAL PROPERTY REGISTRATION</div>
    
    <div class="content">
      <p style="text-align: center; font-weight: bold; margin: 30px 0;">BE IT KNOWN THAT</p>
      
      <div class="recipient-name">${applicantName}</div>
      <p style="text-align: center;">University of Caloocan City</p>
      
      <p>has duly registered with the Intellectual Property Office of the University of Caloocan City the following intellectual property which has been evaluated and approved:</p>
      
      <div class="ip-title">"${title}"</div>
      
      <div class="details-table">
        <div class="details-row">
          <div class="details-label">Type:</div>
          <div class="details-value">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
          <div class="details-label">Registration Date:</div>
          <div class="details-value">${registrationDate}</div>
        </div>
        <div class="details-row">
          <div class="details-label">Status:</div>
          <div class="details-value">Approved</div>
          <div class="details-label">Tracking ID:</div>
          <div class="details-value">${referenceNumber}</div>
        </div>
        ${coCreators ? `
        <div class="details-row">
          <div class="details-label">Co-Creators:</div>
          <div class="details-value">${coCreators}</div>
        </div>
        ` : ''}
        ${evaluationScore ? `
        <div class="details-row">
          <div class="details-label">Evaluation Score:</div>
          <div class="details-value">${evaluationScore}</div>
        </div>
        ` : ''}
      </div>
      
      <div class="footer-text">
        <p>This certificate confirms the official registration of this intellectual property with the University of Caloocan City Intellectual Property Office. All rights and protections afforded by the University's IP Policy apply from the date of registration.</p>
      </div>
      
      <div class="footer-text" style="margin-top: 20px;">
        <p style="font-style: italic;">IN WITNESS WHEREOF, this certificate has been duly signed and sealed by the authorized representatives of the University of Caloocan City on this ${new Date().toLocaleDateString('en-US', { day: 'numeric' })} day of ${new Date().toLocaleDateString('en-US', { month: 'long' })}, ${new Date().getFullYear()}.</p>
      </div>
      
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Director</div>
          <div class="signature-subtitle">INTELLECTUAL PROPERTY OFFICE</div>
          <div class="signature-subtitle">University of Caloocan City</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">Dean</div>
          <div class="signature-subtitle">COLLEGE OF COMPUTER STUDIES</div>
          <div class="signature-subtitle">University of Caloocan City</div>
        </div>
        
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-title">President</div>
          <div class="signature-subtitle">UNIVERSITY OF CALOOCAN CITY</div>
          <div class="signature-subtitle">Office of the President</div>
        </div>
      </div>
    </div>
    
    <div class="footer-info">
      <p>Registration No: ${referenceNumber}</p>
      <p>Issued on: ${registrationDate}</p>
      <p>At: Caloocan City, Philippines</p>
    </div>
    
    <div class="qr-placeholder">
      <p>Scan to verify authenticity</p>
      <p>${referenceNumber}</p>
    </div>
  </div>
</body>
</html>
    `;

    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: certificateHtml,
        landscape: false,
        printBackground: true,
      }),
    });

    if (!pdfResponse.ok) {
      console.error('PDF generation failed:', await pdfResponse.text());
      const certificateRecord = {
        ip_record_id: ipRecordId,
        certificate_number: referenceNumber,
        applicant_id: (await supabase.from('ip_records').select('applicant_id').eq('id', ipRecordId).single()).data?.applicant_id,
        title,
        category,
        registration_date: new Date().toISOString(),
        issued_by: (await supabase.from('users').select('id').eq('auth_user_id', user.id).single()).data?.id,
        qr_code_data: qrCodeData,
        evaluation_score: evaluationScore,
        co_creators: coCreators,
      };

      const { data: certificate, error: certError } = await supabase
        .from('certificates')
        .insert(certificateRecord)
        .select()
        .single();

      if (certError) throw certError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          certificate,
          message: 'Certificate record created (PDF generation service unavailable)'
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

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const fileName = `certificate-${referenceNumber}-${Date.now()}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('certificates')
      .getPublicUrl(fileName);

    const certificateRecord = {
      ip_record_id: ipRecordId,
      certificate_number: referenceNumber,
      applicant_id: (await supabase.from('ip_records').select('applicant_id').eq('id', ipRecordId).single()).data?.applicant_id,
      title,
      category,
      registration_date: new Date().toISOString(),
      issued_by: (await supabase.from('users').select('id').eq('auth_user_id', user.id).single()).data?.id,
      pdf_url: publicUrl,
      file_path: fileName,
      qr_code_data: qrCodeData,
      evaluation_score: evaluationScore,
      co_creators: coCreators,
    };

    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert(certificateRecord)
      .select()
      .single();

    if (certError) throw certError;

    return new Response(
      JSON.stringify({ success: true, certificate, pdfUrl: publicUrl }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in generate-certificate:', error);
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