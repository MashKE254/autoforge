/**
 * SUPPORT TICKETING SERVICE
 *
 * File: src/services/support-service.ts
 *
 * Purpose:
 * - Handle support tickets from users
 * - AI-powered triage and suggested solutions
 * - Automatic routing to support staff
 * - Knowledge base integration
 *
 * This enables non-technical users to get help when they need it.
 */

import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================================================
// TYPES
// ============================================================================

export interface CreateTicketParams {
  userId: string;
  subject: string;
  description: string;
  category: 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST' | 'BUG_REPORT' | 'GENERAL' | 'ACCOUNT';
  managedAppId?: string;
}

export interface AITriageResult {
  suggestion: string;
  confidence: number; // 0-1
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  needsHumanReview: boolean;
  relatedArticles?: string[];
}

export interface TicketResponse {
  id: string;
  subject: string;
  status: string;
  aiSuggestion?: string;
  canAutoResolve: boolean;
}

// ============================================================================
// SUPPORT SERVICE CLASS
// ============================================================================

export class SupportService {
  /**
   * Create a new support ticket with AI triage
   */
  async createTicket(params: CreateTicketParams): Promise<TicketResponse> {
    console.log(`📧 Creating support ticket: ${params.subject}`);

    // Step 1: AI Triage - analyze the issue
    const triage = await this.triageTicket(params.description, params.category);

    // Step 2: Determine priority
    const priority = triage.priority;

    // Step 3: Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: params.userId,
        managedAppId: params.managedAppId,
        subject: params.subject,
        description: params.description,
        category: params.category,
        priority,
        aiTriaged: true,
        aiSuggestion: triage.suggestion,
        aiConfidence: triage.confidence,
      },
    });

    // Step 4: Create initial message
    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        content: params.description,
        isStaff: false,
        authorId: params.userId,
      },
    });

    // Step 5: If high confidence and not critical, post AI suggestion
    if (triage.confidence > 0.8 && !triage.needsHumanReview) {
      await this.addAISuggestion(ticket.id, triage.suggestion);
    }

    // Step 6: If critical, assign to staff immediately
    if (priority === 'CRITICAL' || triage.needsHumanReview) {
      await this.assignToStaff(ticket.id);
      await this.notifyStaff(ticket.id, params.subject, priority);
    }

    // Step 7: Notify user
    await this.notifyUserTicketCreated(ticket.id, params.userId);

    console.log(`✅ Ticket created: ${ticket.id} (Priority: ${priority})`);

    return {
      id: ticket.id,
      subject: params.subject,
      status: ticket.status,
      aiSuggestion: triage.confidence > 0.8 ? triage.suggestion : undefined,
      canAutoResolve: triage.confidence > 0.9 && !triage.needsHumanReview,
    };
  }

  /**
   * AI-powered ticket triage
   */
  private async triageTicket(
    description: string,
    category: string
  ): Promise<AITriageResult> {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a technical support AI for AutoForge, a platform that builds AI-powered applications.

Analyze this support ticket and provide:
1. A helpful suggested solution
2. Confidence score (0-1) in your solution
3. Priority level (LOW, MEDIUM, HIGH, CRITICAL)
4. Whether it needs human review

Category: ${category}
Description: ${description}

Common issues and solutions:
- "App not loading" → Check deployment status, check Vercel logs, verify environment variables
- "Database error" → Check database connection, verify migrations ran, check credentials
- "Authentication not working" → Verify Clerk/NextAuth configuration, check API keys
- "Payment failed" → Check Stripe configuration, verify webhook setup
- "Slow performance" → Check database queries, verify caching, check API response times

Output JSON:
{
  "suggestion": "Detailed step-by-step solution",
  "confidence": 0.85,
  "priority": "MEDIUM",
  "needsHumanReview": false,
  "relatedArticles": ["article-slug-1", "article-slug-2"]
}`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Invalid AI response');
    }

    const jsonMatch = response.text.match(/```json\n([\s\S]+?)\n```/) || response.text.match(/\{[\s\S]+\}/);
    if (!jsonMatch) {
      // Fallback if AI doesn't return proper JSON
      return {
        suggestion: response.text.slice(0, 500),
        confidence: 0.5,
        priority: 'MEDIUM',
        needsHumanReview: true,
      };
    }

    return JSON.parse(jsonMatch[1] || jsonMatch[0]);
  }

  /**
   * Add AI suggestion as a message
   */
  private async addAISuggestion(ticketId: string, suggestion: string): Promise<void> {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        content: `**AI Assistant:**\n\n${suggestion}\n\n---\n\n*This is an AI-generated suggestion. If this doesn't resolve your issue, a support specialist will respond shortly.*`,
        isStaff: true,
        authorId: 'ai-assistant',
      },
    });
  }

  /**
   * Assign ticket to support staff
   */
  private async assignToStaff(ticketId: string): Promise<void> {
    // TODO: Implement staff assignment logic (round-robin, workload-based, etc.)
    // For now, just mark as assigned
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'IN_PROGRESS',
        assignedAt: new Date(),
      },
    });
  }

  /**
   * Notify support staff about critical ticket
   */
  private async notifyStaff(
    ticketId: string,
    subject: string,
    priority: string
  ): Promise<void> {
    const staffEmail = process.env.SUPPORT_EMAIL || 'support@autoforge.app';

    await resend.emails.send({
      from: 'AutoForge Support <notifications@autoforge.app>',
      to: staffEmail,
      subject: `[${priority}] New Support Ticket: ${subject}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2 style="color: ${priority === 'CRITICAL' ? '#DC2626' : '#F59E0B'};">
            New ${priority} Priority Ticket
          </h2>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <a href="https://autoforge.app/admin/support/${ticketId}"
             style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">
            View Ticket
          </a>
        </div>
      `,
    });
  }

  /**
   * Notify user that ticket was created
   */
  private async notifyUserTicketCreated(ticketId: string, userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return;

    await resend.emails.send({
      from: 'AutoForge Support <support@autoforge.app>',
      to: user.email,
      subject: 'Support Ticket Created - We\'re Here to Help!',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3B82F6;">👋 Hi ${user.name || 'there'}!</h2>

          <p>We've received your support request and our team is on it.</p>

          <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p style="margin-top: 10px;">You can track the status of your ticket anytime:</p>
            <a href="https://autoforge.app/support/${ticketId}"
               style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
              View Ticket
            </a>
          </div>

          <p><strong>What happens next?</strong></p>
          <ul>
            <li>Our AI assistant may have already suggested a solution - check your ticket page</li>
            <li>If needed, a support specialist will respond within 24 hours</li>
            <li>You'll receive an email when there's an update</li>
          </ul>

          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;" />

          <p style="color: #6B7280; font-size: 14px;">
            Need urgent help? Reply to this email or visit our
            <a href="https://autoforge.app/docs" style="color: #3B82F6;">documentation</a>.
          </p>
        </div>
      `,
    });
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(
    ticketId: string,
    content: string,
    isStaff: boolean = false,
    authorId?: string
  ): Promise<void> {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        content,
        isStaff,
        authorId,
      },
    });

    // Update ticket status
    if (!isStaff) {
      // User responded, mark as needing attention
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // Notify other party
    await this.notifyNewMessage(ticketId, content, isStaff);
  }

  /**
   * Notify about new message
   */
  private async notifyNewMessage(
    ticketId: string,
    content: string,
    fromStaff: boolean
  ): Promise<void> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!ticket?.user.email) return;

    // Only notify user if staff responded
    if (fromStaff) {
      await resend.emails.send({
        from: 'AutoForge Support <support@autoforge.app>',
        to: ticket.user.email,
        subject: `Re: ${ticket.subject}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Response to Your Support Ticket</h2>
            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="white-space: pre-wrap;">${content}</p>
            </div>
            <a href="https://autoforge.app/support/${ticketId}"
               style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
              View Full Conversation
            </a>
          </div>
        `,
      });
    }
  }

  /**
   * Resolve a ticket
   */
  async resolveTicket(ticketId: string, resolution: string): Promise<void> {
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolution,
      },
    });

    // Add resolution message
    await this.addMessage(ticketId, `**Ticket Resolved**\n\n${resolution}`, true);
  }

  /**
   * Get ticket with messages
   */
  async getTicket(ticketId: string) {
    return await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
        managedApp: {
          select: {
            name: true,
            subdomain: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string) {
    return await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        managedApp: {
          select: {
            name: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get all open tickets (for staff dashboard)
   */
  async getOpenTickets() {
    return await prisma.supportTicket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER'] },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}

// Export singleton instance
export const supportService = new SupportService();
