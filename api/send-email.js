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
export async function sendMailInternal({ to, subject, htmlBody, html, recipientName, text }) {
  const contentHtml = htmlBody || html;
  if (!to) throw new Error('Missing required field: "to"');
  if (!subject) throw new Error('Missing required field: "subject"');
  if (!contentHtml) throw new Error('Missing required field: "htmlBody"');

  const smtpHost = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error('SMTP credentials not configured. Ensure SMTP_USER and SMTP_PASS are set.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    tls: {
      rejectUnauthorized: true
    }
  });

  const formattedTo = recipientName ? `"${recipientName}" <${to}>` : to;
  const plainText = text || contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const mailOptions = {
    from: '"ArenaX Esports" <noreply@arenax.cyou>',
    to: formattedTo,
    subject: subject,
    html: contentHtml,
    text: plainText
  };

  return await transporter.sendMail(mailOptions);
}

export default async function handler(req, res) {
  // 1. Set CORS headers for arenax.cyou and external client requests
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  try {
    const info = await sendMailInternal({ to, subject, htmlBody: htmlBody || html, recipientName, text });

    return res.status(200).json({
      success: true,
      message: 'Email delivered successfully',
      messageId: info.messageId,
      envelope: info.envelope,
      response: info.response
    });
  } catch (err) {
    console.error('[ArenaX Mailer] Send Error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch email via SMTP',
      code: err.code || 'SMTP_ERROR'
    });
  }
}
