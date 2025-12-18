/**
 * Messaging Module
 *
 * Provides SMS, push notifications, and rich email templates
 */

export interface MessagingModuleConfig {
  providers: Array<'twilio' | 'resend' | 'sendgrid' | 'firebase'>;
  features?: Array<'sms' | 'push' | 'email' | 'templates' | 'campaigns'>;
}

export interface MessagingModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

const twilioSMS = `import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS(to: string, body: string) {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
    });

    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('SMS error:', error);
    throw error;
  }
}

export async function sendBulkSMS(recipients: string[], body: string) {
  const results = await Promise.allSettled(
    recipients.map(to => sendSMS(to, body))
  );

  return results.map((result, index) => ({
    to: recipients[index],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
`;

const emailTemplates = `import { render } from '@react-email/render';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Welcome Email Template
export const WelcomeEmail = ({ name }: { name: string }) => (
  <html>
    <head>
      <style>{\`
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .button { background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; }
      \`}</style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <h1>Welcome to Our Platform!</h1>
        </div>
        <div className="content">
          <p>Hi {name},</p>
          <p>Thanks for joining us! We're excited to have you on board.</p>
          <p>
            <a href="#" className="button">Get Started</a>
          </p>
          <p>Best regards,<br />The Team</p>
        </div>
      </div>
    </body>
  </html>
);

// Order Confirmation Email
export const OrderConfirmationEmail = ({
  orderNumber,
  items,
  total
}: {
  orderNumber: string;
  items: any[];
  total: number;
}) => (
  <html>
    <head>
      <style>{\`
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .order-item { border-bottom: 1px solid #E5E7EB; padding: 10px 0; }
        .total { font-size: 20px; font-weight: bold; margin-top: 20px; }
      \`}</style>
    </head>
    <body>
      <div className="container">
        <div className="header">
          <h1>Order Confirmed!</h1>
        </div>
        <div className="content">
          <p>Order Number: <strong>{orderNumber}</strong></p>
          <h2>Items:</h2>
          {items.map((item, idx) => (
            <div key={idx} className="order-item">
              <div>{item.name} × {item.quantity}</div>
              <div>\${(item.price / 100).toFixed(2)}</div>
            </div>
          ))}
          <div className="total">Total: \${(total / 100).toFixed(2)}</div>
        </div>
      </div>
    </body>
  </html>
);

export async function sendWelcomeEmail(to: string, name: string) {
  const html = render(<WelcomeEmail name={name} />);

  return await resend.emails.send({
    from: 'noreply@yourdomain.com',
    to,
    subject: 'Welcome!',
    html,
  });
}

export async function sendOrderConfirmation(
  to: string,
  orderNumber: string,
  items: any[],
  total: number
) {
  const html = render(
    <OrderConfirmationEmail orderNumber={orderNumber} items={items} total={total} />
  );

  return await resend.emails.send({
    from: 'orders@yourdomain.com',
    to,
    subject: \`Order Confirmation - \${orderNumber}\`,
    html,
  });
}
`;

const pushNotifications = `// This would typically use Firebase Cloud Messaging or similar
// For demonstration, showing the structure

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  sound?: string;
}

export async function sendPushNotification(
  deviceTokens: string[],
  notification: PushNotification
) {
  // Implement with Firebase Cloud Messaging, OneSignal, or similar
  console.log('Sending push notification:', notification);
  console.log('To devices:', deviceTokens);

  // Example Firebase implementation would go here
  return { success: true, sent: deviceTokens.length };
}

export async function subscribeToTopic(token: string, topic: string) {
  // Subscribe a device to a notification topic
  console.log(\`Subscribing \${token} to topic: \${topic}\`);
  return { success: true };
}
`;

const apiRoute = `import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/messaging/twilio';
import { sendWelcomeEmail } from '@/lib/messaging/email-templates';

export async function POST(req: NextRequest) {
  try {
    const { type, ...data } = await req.json();

    if (type === 'sms') {
      const result = await sendSMS(data.to, data.message);
      return NextResponse.json(result);
    }

    if (type === 'email') {
      const result = await sendWelcomeEmail(data.to, data.name);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Messaging error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
`;

export function generateMessagingModule(config: MessagingModuleConfig): MessagingModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const envVars: string[] = [];
  const dependencies: string[] = [];
  const instructions: string[] = [];

  if (config.providers.includes('twilio')) {
    files.push({ path: 'lib/messaging/twilio.ts', content: twilioSMS });
    dependencies.push('twilio');
    envVars.push('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER');
    instructions.push(
      'Create a Twilio account at https://www.twilio.com',
      'Purchase a phone number in the Twilio console',
      'Copy your Account SID and Auth Token to environment variables'
    );
  }

  if (config.providers.includes('resend')) {
    files.push({ path: 'lib/messaging/email-templates.tsx', content: emailTemplates });
    dependencies.push('resend', 'react-email');
    envVars.push('RESEND_API_KEY');
    instructions.push(
      'Create a Resend account at https://resend.com',
      'Verify your sending domain',
      'Generate an API key and add to RESEND_API_KEY'
    );
  }

  files.push(
    { path: 'lib/messaging/push-notifications.ts', content: pushNotifications },
    { path: 'app/api/messaging/route.ts', content: apiRoute }
  );

  return { files, envVars, dependencies, instructions };
}

export function getMessagingModulePrompt(config: MessagingModuleConfig): string {
  return `## Messaging Module\n\nProviders: ${config.providers.join(', ')}\nFeatures: ${config.features?.join(', ') || 'SMS, email, push'}\n\nIncludes multi-channel messaging with SMS, email templates, and push notifications.`;
}
