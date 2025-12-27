/**
 * Demo Mode for All Integrations
 *
 * Super realistic mock responses for each integration
 */

import { MockDataGenerator } from './mock-data-generator';

export class IntegrationsDemoMode {
  // ============================================================================
  // TWITTER
  // ============================================================================
  static async twitter_postTweet(text: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      tweet: {
        id: `tweet_${Date.now()}`,
        text,
        createdAt: new Date(),
        author: {
          name: 'Demo User',
          username: '@demo_user',
        },
        likes: 0,
        retweets: 0,
        replies: 0,
      },
    };
  }

  static async twitter_getTimeline() {
    await MockDataGenerator.simulateDelay(1000);
    return {
      tweets: Array(10).fill(0).map(() => MockDataGenerator.generateTweet()),
    };
  }

  // ============================================================================
  // LINKEDIN
  // ============================================================================
  static async linkedin_sharePost(content: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      post: MockDataGenerator.generateLinkedInPost(),
    };
  }

  static async linkedin_getProfile() {
    await MockDataGenerator.simulateDelay(800);
    return {
      name: MockDataGenerator.randomName(),
      headline: 'Product Manager at ' + MockDataGenerator.randomCompany(),
      connections: MockDataGenerator.randomNumber(500, 5000),
      followers: MockDataGenerator.randomNumber(1000, 10000),
    };
  }

  // ============================================================================
  // INSTAGRAM
  // ============================================================================
  static async instagram_postPhoto(imageUrl: string, caption: string) {
    await MockDataGenerator.simulateDelay(2000);
    return {
      success: true,
      post: {
        id: `ig_${Date.now()}`,
        imageUrl,
        caption,
        likes: MockDataGenerator.randomNumber(10, 500),
        comments: MockDataGenerator.randomNumber(2, 50),
        createdAt: new Date(),
      },
    };
  }

  // ============================================================================
  // FACEBOOK
  // ============================================================================
  static async facebook_postUpdate(message: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      post: {
        id: `fb_${Date.now()}`,
        message,
        likes: MockDataGenerator.randomNumber(5, 200),
        comments: MockDataGenerator.randomNumber(1, 50),
        shares: MockDataGenerator.randomNumber(0, 20),
      },
    };
  }

  // ============================================================================
  // GOOGLE CALENDAR
  // ============================================================================
  static async googleCalendar_createEvent(event: any) {
    await MockDataGenerator.simulateDelay(1000);
    return {
      success: true,
      event: MockDataGenerator.generateCalendarEvent(),
    };
  }

  static async googleCalendar_listEvents() {
    await MockDataGenerator.simulateDelay(800);
    return {
      events: Array(5).fill(0).map(() => MockDataGenerator.generateCalendarEvent()),
    };
  }

  // ============================================================================
  // GMAIL
  // ============================================================================
  static async gmail_sendEmail(to: string, subject: string, body: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      sent: new Date(),
    };
  }

  static async gmail_listEmails() {
    await MockDataGenerator.simulateDelay(1000);
    return {
      emails: Array(10).fill(0).map(() => MockDataGenerator.generateEmail()),
    };
  }

  // ============================================================================
  // SHOPIFY
  // ============================================================================
  static async shopify_listProducts() {
    await MockDataGenerator.simulateDelay(1000);
    const products = Array(5).fill(0).map((_, i) => ({
      id: `prod_${i + 1}`,
      title: `${MockDataGenerator.productAdjectives[i % 5]} Product ${i + 1}`,
      price: MockDataGenerator.randomNumber(1000, 10000) / 100,
      inventory: MockDataGenerator.randomNumber(0, 100),
      sold: MockDataGenerator.randomNumber(10, 500),
    }));
    return { products };
  }

  static async shopify_listOrders() {
    await MockDataGenerator.simulateDelay(1000);
    const orders = Array(8).fill(0).map((_, i) => ({
      id: `order_${i + 1}`,
      customerName: MockDataGenerator.randomName(),
      total: MockDataGenerator.randomNumber(2000, 50000) / 100,
      status: ['pending', 'paid', 'shipped', 'delivered'][MockDataGenerator.randomNumber(0, 3)],
      createdAt: MockDataGenerator.randomDate(30),
    }));
    return { orders };
  }

  // ============================================================================
  // STRIPE
  // ============================================================================
  static async stripe_createPayment(amount: number, currency: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      payment: MockDataGenerator.generatePayment(),
    };
  }

  static async stripe_listPayments() {
    await MockDataGenerator.simulateDelay(1000);
    return {
      payments: Array(10).fill(0).map(() => MockDataGenerator.generatePayment()),
    };
  }

  static async stripe_createSubscription(customerId: string, priceId: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      subscription: {
        id: `sub_${Date.now()}`,
        customerId,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        plan: {
          amount: MockDataGenerator.randomNumber(1000, 10000),
          interval: 'month',
        },
      },
    };
  }

  // ============================================================================
  // DISCORD
  // ============================================================================
  static async discord_sendMessage(channelId: string, message: string) {
    await MockDataGenerator.simulateDelay(800);
    return {
      success: true,
      message: {
        id: `msg_${Date.now()}`,
        content: message,
        author: { username: 'DemoBot', id: 'bot_123' },
        timestamp: new Date(),
      },
    };
  }

  // ============================================================================
  // SLACK
  // ============================================================================
  static async slack_postMessage(channel: string, text: string) {
    await MockDataGenerator.simulateDelay(800);
    return {
      success: true,
      ts: `${Date.now()}`,
      channel,
    };
  }

  // ============================================================================
  // GITHUB
  // ============================================================================
  static async github_listRepos() {
    await MockDataGenerator.simulateDelay(1000);
    const repos = Array(5).fill(0).map((_, i) => ({
      id: i + 1,
      name: `project-${i + 1}`,
      description: 'A demo repository',
      stars: MockDataGenerator.randomNumber(0, 1000),
      forks: MockDataGenerator.randomNumber(0, 100),
      language: ['TypeScript', 'Python', 'Go', 'Rust', 'JavaScript'][i % 5],
    }));
    return { repos };
  }

  static async github_createIssue(repo: string, title: string, body: string) {
    await MockDataGenerator.simulateDelay(1000);
    return {
      success: true,
      issue: {
        number: MockDataGenerator.randomNumber(1, 999),
        title,
        body,
        state: 'open',
        createdAt: new Date(),
      },
    };
  }

  // ============================================================================
  // NOTION
  // ============================================================================
  static async notion_createPage(title: string, content: any) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      page: {
        id: `page_${Date.now()}`,
        title,
        url: `https://notion.so/page_${Date.now()}`,
        createdAt: new Date(),
      },
    };
  }

  // ============================================================================
  // OPENAI
  // ============================================================================
  static async openai_chatCompletion(messages: any[]) {
    await MockDataGenerator.simulateDelay(2000);
    const lastMessage = messages[messages.length - 1];
    return MockDataGenerator.generateAIResponse(lastMessage.content);
  }

  static async openai_generateImage(prompt: string) {
    await MockDataGenerator.simulateDelay(3000);
    return {
      success: true,
      images: [
        {
          url: `https://placehold.co/1024x1024/violet/white?text=${encodeURIComponent(prompt.slice(0, 20))}`,
          prompt,
        },
      ],
    };
  }

  // ============================================================================
  // ANTHROPIC
  // ============================================================================
  static async anthropic_chatCompletion(messages: any[]) {
    await MockDataGenerator.simulateDelay(2000);
    const lastMessage = messages[messages.length - 1];
    return {
      text: MockDataGenerator.generateAIResponse(lastMessage.content).text,
      model: 'claude-3-opus-20240229',
      tokensUsed: MockDataGenerator.randomNumber(100, 500),
    };
  }

  // ============================================================================
  // TWILIO
  // ============================================================================
  static async twilio_sendSMS(to: string, message: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      sid: `SM${Date.now()}`,
      status: 'sent',
      to,
      from: '+1234567890',
    };
  }

  // ============================================================================
  // SENDGRID
  // ============================================================================
  static async sendgrid_sendEmail(to: string, subject: string, html: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      success: true,
      messageId: `sg_${Date.now()}`,
      status: 'delivered',
    };
  }

  // ============================================================================
  // AWS S3
  // ============================================================================
  static async s3_uploadFile(key: string, file: any) {
    await MockDataGenerator.simulateDelay(2000);
    return {
      success: true,
      url: `https://demo-bucket.s3.amazonaws.com/${key}`,
      key,
      size: MockDataGenerator.randomNumber(1000, 10000000),
    };
  }

  static async s3_listObjects(prefix: string) {
    await MockDataGenerator.simulateDelay(1000);
    const objects = Array(10).fill(0).map((_, i) => ({
      key: `${prefix}/file-${i + 1}.jpg`,
      size: MockDataGenerator.randomNumber(1000, 10000000),
      lastModified: MockDataGenerator.randomDate(30),
    }));
    return { objects };
  }

  // ============================================================================
  // GOOGLE MAPS
  // ============================================================================
  static async googleMaps_geocode(address: string) {
    await MockDataGenerator.simulateDelay(800);
    return {
      success: true,
      results: [
        {
          address,
          lat: MockDataGenerator.randomNumber(-90, 90),
          lng: MockDataGenerator.randomNumber(-180, 180),
          placeId: `place_${Date.now()}`,
        },
      ],
    };
  }

  static async googleMaps_getDirections(origin: string, destination: string) {
    await MockDataGenerator.simulateDelay(1000);
    return {
      success: true,
      distance: `${MockDataGenerator.randomNumber(1, 100)} km`,
      duration: `${MockDataGenerator.randomNumber(5, 120)} min`,
      routes: [
        {
          summary: 'Via Highway 1',
          steps: [
            'Head north on Main St',
            'Turn right onto Highway 1',
            'Take exit 42',
            'Destination will be on the right',
          ],
        },
      ],
    };
  }

  // ============================================================================
  // REPLICATE
  // ============================================================================
  static async replicate_runModel(model: string, input: any) {
    await MockDataGenerator.simulateDelay(3000);
    return {
      success: true,
      output: `https://placehold.co/1024x1024/cyan/white?text=${encodeURIComponent('AI Generated')}`,
      status: 'succeeded',
      model,
    };
  }

  // ============================================================================
  // ANALYTICS HELPER
  // ============================================================================
  static async getAnalyticsDashboard(integrationId: string) {
    await MockDataGenerator.simulateDelay(1500);
    return {
      integration: integrationId,
      stats: MockDataGenerator.generateAnalytics(),
      chartData: MockDataGenerator.generateChartData(30),
      topContent: [
        { title: 'Post about new feature', engagement: MockDataGenerator.randomNumber(100, 1000) },
        { title: 'Company announcement', engagement: MockDataGenerator.randomNumber(50, 800) },
        { title: 'Behind the scenes', engagement: MockDataGenerator.randomNumber(30, 600) },
      ],
    };
  }
}
