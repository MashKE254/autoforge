/**
 * SendGrid Integration Client
 *
 * API key-based integration for SendGrid email
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import sgMail from '@sendgrid/mail';

export class SendGridClient extends APIKeyClient {
  private fromEmail?: string;

  constructor(options: { userId?: string }) {
    super('sendgrid', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    if (this.apiKey && !this.isDemoMode) {
      sgMail.setApiKey(this.apiKey);
      this.fromEmail = this.credentials?.accountInfo?.fromEmail || process.env.SENDGRID_FROM_EMAIL;
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(
    to: string | string[],
    subject: string,
    text: string,
    html?: string,
    from?: string
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const msg = {
          to,
          from: from || this.fromEmail!,
          subject,
          text,
          html: html || text,
        };

        const response = await sgMail.send(msg);

        return {
          success: true,
          statusCode: response[0].statusCode,
          messageId: response[0].headers['x-message-id'],
        };
      },
      async () => IntegrationsDemoMode.sendgrid_sendEmail(to, subject, text),
      'send_email'
    );
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmail(
    recipients: Array<{ to: string; subject: string; text: string; html?: string }>,
    from?: string
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const messages = recipients.map((r) => ({
          to: r.to,
          from: from || this.fromEmail!,
          subject: r.subject,
          text: r.text,
          html: r.html || r.text,
        }));

        const response = await sgMail.send(messages);

        return {
          success: true,
          sent: response.length,
          statusCodes: response.map((r) => r.statusCode),
        };
      },
      async () => IntegrationsDemoMode.sendgrid_sendBulkEmail(recipients),
      'send_bulk_email'
    );
  }

  /**
   * Send email with template
   */
  async sendTemplateEmail(
    to: string | string[],
    templateId: string,
    dynamicData: any,
    from?: string
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const msg = {
          to,
          from: from || this.fromEmail!,
          templateId,
          dynamicTemplateData: dynamicData,
        };

        const response = await sgMail.send(msg);

        return {
          success: true,
          statusCode: response[0].statusCode,
          messageId: response[0].headers['x-message-id'],
        };
      },
      async () => IntegrationsDemoMode.sendgrid_sendTemplateEmail(to, templateId, dynamicData),
      'send_template_email'
    );
  }

  /**
   * Send email with attachment
   */
  async sendEmailWithAttachment(
    to: string,
    subject: string,
    text: string,
    attachments: Array<{ content: string; filename: string; type?: string }>,
    from?: string
  ): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const msg = {
          to,
          from: from || this.fromEmail!,
          subject,
          text,
          attachments: attachments.map((a) => ({
            content: a.content,
            filename: a.filename,
            type: a.type || 'application/octet-stream',
            disposition: 'attachment',
          })),
        };

        const response = await sgMail.send(msg);

        return {
          success: true,
          statusCode: response[0].statusCode,
          messageId: response[0].headers['x-message-id'],
        };
      },
      async () => IntegrationsDemoMode.sendgrid_sendEmailWithAttachment(to, subject, text),
      'send_email_with_attachment'
    );
  }

  /**
   * Add contact to marketing list
   */
  async addContact(email: string, firstName?: string, lastName?: string, customFields?: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const data = {
          contacts: [
            {
              email,
              first_name: firstName,
              last_name: lastName,
              ...customFields,
            },
          ],
        };

        const response = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`SendGrid API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.sendgrid_addContact(email, firstName, lastName),
      'add_contact'
    );
  }

  /**
   * Get email statistics
   */
  async getEmailStats(startDate: string, endDate?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const end = endDate || new Date().toISOString().split('T')[0];
        const response = await fetch(
          `https://api.sendgrid.com/v3/stats?start_date=${startDate}&end_date=${end}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`SendGrid API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.sendgrid_getEmailStats(),
      'get_email_stats'
    );
  }
}
