/**
 * Twilio Integration Client
 *
 * API key-based integration for Twilio SMS and Voice
 */

import { APIKeyClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';
import twilio from 'twilio';

export class TwilioClient extends APIKeyClient {
  private client?: ReturnType<typeof twilio>;
  private fromPhoneNumber?: string;

  constructor(options: { userId?: string }) {
    super('twilio', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
    if (this.apiKey && this.apiSecret && !this.isDemoMode) {
      this.client = twilio(this.apiKey, this.apiSecret);
      this.fromPhoneNumber = this.credentials?.accountInfo?.phoneNumber;
    }
  }

  /**
   * Send an SMS
   */
  async sendSMS(to: string, message: string, from?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const messageResponse = await this.client!.messages.create({
          body: message,
          to,
          from: from || this.fromPhoneNumber,
        });

        return {
          sid: messageResponse.sid,
          status: messageResponse.status,
          to: messageResponse.to,
          from: messageResponse.from,
          body: messageResponse.body,
          dateSent: messageResponse.dateSent,
        };
      },
      async () => IntegrationsDemoMode.twilio_sendSMS(to, message),
      'send_sms'
    );
  }

  /**
   * Make a phone call
   */
  async makeCall(to: string, callbackUrl: string, from?: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const call = await this.client!.calls.create({
          url: callbackUrl,
          to,
          from: from || this.fromPhoneNumber,
        });

        return {
          sid: call.sid,
          status: call.status,
          to: call.to,
          from: call.from,
          duration: call.duration,
        };
      },
      async () => IntegrationsDemoMode.twilio_makeCall(to, callbackUrl),
      'make_call'
    );
  }

  /**
   * Get message history
   */
  async getMessages(limit: number = 20): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const messages = await this.client!.messages.list({ limit });

        return {
          messages: messages.map((msg) => ({
            sid: msg.sid,
            status: msg.status,
            to: msg.to,
            from: msg.from,
            body: msg.body,
            dateSent: msg.dateSent,
            direction: msg.direction,
          })),
        };
      },
      async () => IntegrationsDemoMode.twilio_getMessages(),
      'get_messages'
    );
  }

  /**
   * Get call history
   */
  async getCalls(limit: number = 20): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const calls = await this.client!.calls.list({ limit });

        return {
          calls: calls.map((call) => ({
            sid: call.sid,
            status: call.status,
            to: call.to,
            from: call.from,
            duration: call.duration,
            startTime: call.startTime,
            endTime: call.endTime,
          })),
        };
      },
      async () => IntegrationsDemoMode.twilio_getCalls(),
      'get_calls'
    );
  }

  /**
   * Send a WhatsApp message
   */
  async sendWhatsApp(to: string, message: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const messageResponse = await this.client!.messages.create({
          body: message,
          to: `whatsapp:${to}`,
          from: `whatsapp:${this.fromPhoneNumber}`,
        });

        return {
          sid: messageResponse.sid,
          status: messageResponse.status,
          to: messageResponse.to,
          from: messageResponse.from,
          body: messageResponse.body,
        };
      },
      async () => IntegrationsDemoMode.twilio_sendWhatsApp(to, message),
      'send_whatsapp'
    );
  }

  /**
   * Verify a phone number (send verification code)
   */
  async sendVerificationCode(to: string, channel: 'sms' | 'call' = 'sms'): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const verification = await this.client!.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
          .verifications.create({
            to,
            channel,
          });

        return {
          sid: verification.sid,
          status: verification.status,
          to: verification.to,
          channel: verification.channel,
        };
      },
      async () => IntegrationsDemoMode.twilio_sendVerificationCode(to, channel),
      'send_verification_code'
    );
  }

  /**
   * Check verification code
   */
  async checkVerificationCode(to: string, code: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const verificationCheck = await this.client!.verify.v2
          .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
          .verificationChecks.create({
            to,
            code,
          });

        return {
          sid: verificationCheck.sid,
          status: verificationCheck.status,
          valid: verificationCheck.status === 'approved',
        };
      },
      async () => IntegrationsDemoMode.twilio_checkVerificationCode(to, code),
      'check_verification_code'
    );
  }
}
