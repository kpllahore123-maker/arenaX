import nodemailer from 'nodemailer';

/**
 * Vercel Serverless Function: Send Email via Brevo SMTP
 * Endpoint: POST /api/send-email
 * 
 * Expected payload:
 * {
 *   "to": "recipient@example.com",
 *   "subject": "Email Subject",
 *   "htmlBody": "<h1>HTML Message</h1>",
 *   "recipientName": "Player Name" (optional)
 * }
 */
export default async function handler(req, res) {
  // 1. Enable CORS for cross-origin requests from ArenaX PWA
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Please use POST.'
    });
  }

  // 2. Safely parse request body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.error('[ArenaX Mailer] Failed to parse request body string as JSON:', e);
    }
  }
  body = body || {};

  const { to, subject, htmlBody, html, recipientName, text } = body;
  const contentHtml = htmlBody || html;

  // 3. Payload validation
  if (!to) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "to" (recipient email address)'
    });
  }

  if (!subject) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "subject"'
    });
  }

  if (!contentHtml) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field: "htmlBody" (HTML content of email)'
    });
  }

  // 4. Read Brevo SMTP configuration from environment variables
  const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  console.log('[ArenaX Mailer] Outgoing email dispatch initiated:', {
    smtpHost,
    smtpPort,
    smtpUserConfigured: Boolean(smtpUser),
    smtpPassConfigured: Boolean(smtpPass),
    to,
    recipientName: recipientName || '(none)',
    subject
  });

  if (!smtpUser || !smtpPass) {
    const errorMsg = 'SMTP credentials not configured. Please ensure SMTP_USER and SMTP_PASS are defined in your environment variables.';
    console.error(`[ArenaX Mailer] Missing Environment Variables: ${errorMsg}`);
    return res.status(500).json({
      success: false,
      error: errorMsg,
      details: {
        SMTP_HOST: smtpHost,
        SMTP_PORT: smtpPort,
        SMTP_USER: Boolean(smtpUser) ? 'Configured' : 'Missing',
        SMTP_PASS: Boolean(smtpPass) ? 'Configured' : 'Missing'
      }
    });
  }

  try {
    // 5. Configure Nodemailer transporter with Brevo SMTP
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // Port 587 uses STARTTLS (secure: false)
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: true
      }
    });

    // 6. Format recipient and fallback plain text
    const formattedTo = recipientName ? `"${recipientName}" <${to}>` : to;
    const plainText = text || contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // 7. Compose mail options with strict From address
    const mailOptions = {
      from: '"ArenaX Esports" <noreply@arenax.cyou>',
      to: formattedTo,
      subject: subject,
      html: contentHtml,
      text: plainText
    };

    console.log(`[ArenaX Mailer] Transmitting message via Brevo SMTP to: ${formattedTo}...`);

    // 8. Dispatch email
    const info = await transporter.sendMail(mailOptions);

    console.log('[ArenaX Mailer] Email sent successfully!', {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response
    });

    return res.status(200).json({
      success: true,
      message: 'Email delivered successfully',
      messageId: info.messageId,
      envelope: info.envelope,
      response: info.response
    });
  } catch (err) {
    // 9. Detailed error logging for Vercel logs and observability
    console.error('[ArenaX Mailer] SMTP Transmission Error:', {
      message: err.message,
      code: err.code,
      command: err.command,
      response: err.response,
      responseCode: err.responseCode,
      stack: err.stack
    });

    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch email via SMTP',
      code: err.code || 'SMTP_ERROR',
      command: err.command || null,
      response: err.response || null,
      responseCode: err.responseCode || null
    });
  }
}
