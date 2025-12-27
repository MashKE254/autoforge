/**
 * Google Calendar Integration Client
 *
 * OAuth-based integration for Google Calendar API
 */

import { OAuthClient } from '../base-client';
import { IntegrationsDemoMode } from '@/lib/demo-mode/integrations-demo';

export class GoogleCalendarClient extends OAuthClient {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';

  constructor(options: { userId?: string }) {
    super('google-calendar', options);
  }

  async initialize(): Promise<void> {
    await this.loadCredentials();
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: {
    summary: string;
    description?: string;
    start: Date | string;
    end: Date | string;
    attendees?: string[];
    location?: string;
  }): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/calendars/primary/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              summary: event.summary,
              description: event.description,
              location: event.location,
              start: {
                dateTime: new Date(event.start).toISOString(),
                timeZone: 'America/New_York',
              },
              end: {
                dateTime: new Date(event.end).toISOString(),
                timeZone: 'America/New_York',
              },
              attendees: event.attendees?.map((email) => ({ email })),
              reminders: {
                useDefault: true,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.googleCalendar_createEvent(event),
      'create_event'
    );
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(maxResults: number = 10): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const now = new Date().toISOString();

        const response = await fetch(
          `${this.baseUrl}/calendars/primary/events?timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.googleCalendar_getUpcomingEvents(),
      'get_upcoming_events'
    );
  }

  /**
   * Update an event
   */
  async updateEvent(eventId: string, updates: {
    summary?: string;
    description?: string;
    start?: Date | string;
    end?: Date | string;
    location?: string;
  }): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const body: any = {};
        if (updates.summary) body.summary = updates.summary;
        if (updates.description) body.description = updates.description;
        if (updates.location) body.location = updates.location;
        if (updates.start) {
          body.start = {
            dateTime: new Date(updates.start).toISOString(),
            timeZone: 'America/New_York',
          };
        }
        if (updates.end) {
          body.end = {
            dateTime: new Date(updates.end).toISOString(),
            timeZone: 'America/New_York',
          };
        }

        const response = await fetch(
          `${this.baseUrl}/calendars/primary/events/${eventId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.googleCalendar_updateEvent(eventId, updates),
      'update_event'
    );
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/calendars/primary/events/${eventId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        return { success: true, deletedId: eventId };
      },
      async () => IntegrationsDemoMode.googleCalendar_deleteEvent(eventId),
      'delete_event'
    );
  }

  /**
   * Get free/busy information
   */
  async getFreeBusy(calendars: string[], timeMin: Date, timeMax: Date): Promise<any> {
    return this.executeWithFallback(
      async () => {
        if (this.isTokenExpired()) await this.refreshAccessToken();

        const response = await fetch(
          `${this.baseUrl}/freeBusy`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              items: calendars.map((id) => ({ id })),
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Google Calendar API error: ${response.statusText}`);
        }

        return await response.json();
      },
      async () => IntegrationsDemoMode.googleCalendar_getFreeBusy(),
      'get_free_busy'
    );
  }

  protected async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh Google access token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.updateStoredTokens({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    });
  }
}
