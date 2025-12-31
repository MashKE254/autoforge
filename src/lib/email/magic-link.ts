/**
 * MAGIC LINK EMAIL NOTIFICATIONS
 *
 * File: src/lib/email/magic-link.ts
 *
 * Send beautiful emails with magic links for passwordless login
 */

interface SendMagicLinkEmailParams {
  to: string;
  appName: string;
  magicLink: string;
  isNewUser?: boolean;
  isReturning?: boolean;
  isPurchase?: boolean;
}

/**
 * Send magic link email to user
 *
 * Note: This is a placeholder implementation.
 * In production, integrate with:
 * - Resend (resend.com)
 * - SendGrid
 * - Postmark
 * - Or your preferred email service
 */
export async function sendMagicLinkEmail({
  to,
  appName,
  magicLink,
  isNewUser = false,
  isReturning = false,
  isPurchase = false,
}: SendMagicLinkEmailParams): Promise<void> {
  console.log(`📧 Sending magic link email to ${to}`);
  console.log(`   App: ${appName}`);
  console.log(`   New user: ${isNewUser}`);
  console.log(`   Purchase: ${isPurchase}`);

  // Determine email subject and message
  const subject = isPurchase
    ? `Your ${appName} is ready! 🎉`
    : isReturning
    ? `Access your ${appName}`
    : `Welcome to ${appName}!`;

  const greeting = isNewUser
    ? `Welcome! Your ${appName} is ready to use.`
    : `Welcome back! Click below to access ${appName}.`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold; text-align: center;">
                ${isPurchase ? '🎉' : '✨'} ${subject}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px; background-color: #18181b; border-left: 1px solid #27272a; border-right: 1px solid #27272a;">
              <p style="margin: 0 0 24px; color: #a1a1aa; font-size: 16px; line-height: 1.6;">
                ${greeting}
              </p>

              ${isPurchase ? `
              <div style="margin: 24px 0; padding: 20px; background-color: #10b981; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px;">
                <p style="margin: 0; color: #ffffff; font-size: 14px; text-align: center;">
                  ✅ Payment confirmed • Instant access granted
                </p>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${magicLink}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);">
                      Access ${appName} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                This link expires in 15 minutes and can only be used once for security.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #09090b; border-left: 1px solid #27272a; border-right: 1px solid #27272a; border-bottom: 1px solid #27272a; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 12px; color: #71717a; font-size: 14px; text-align: center;">
                ${isNewUser ? 'Your account was created automatically - no password needed!' : 'No password needed - just click the link above.'}
              </p>
              <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center;">
                Powered by AutoForge • The Shopify for Software
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // TODO: Replace with actual email service integration
  // Example with Resend:
  /*
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: 'AutoForge <noreply@autoforge.com>',
    to,
    subject,
    html: emailHtml,
  });
  */

  // For now, just log the email (for development)
  console.log(`📧 Email would be sent with subject: "${subject}"`);
  console.log(`   Magic link: ${magicLink}`);
  console.log(`   HTML length: ${emailHtml.length} characters`);

  // In development, you can view the email by opening this in a browser:
  if (process.env.NODE_ENV === 'development') {
    console.log('\n📬 DEVELOPMENT MODE - Magic Link:');
    console.log(`   ${magicLink}\n`);
  }
}
