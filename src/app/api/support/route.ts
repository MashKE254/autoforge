/**
 * Support Tickets API
 * File: src/app/api/support/route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { supportService } from '@/services/support-service';

// POST: Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, description, category, managedAppId } = body;

    if (!subject || !description || !category) {
      return NextResponse.json(
        { error: 'Subject, description, and category are required' },
        { status: 400 }
      );
    }

    const ticket = await supportService.createTicket({
      userId: session.user.id,
      subject,
      description,
      category,
      managedAppId,
    });

    return NextResponse.json({
      success: true,
      ticket,
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
}

// GET: Get user's tickets
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await supportService.getUserTickets(session.user.id);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to get tickets' },
      { status: 500 }
    );
  }
}
