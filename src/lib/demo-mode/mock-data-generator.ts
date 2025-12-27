/**
 * Mock Data Generator
 *
 * Generates super realistic fake data for demo mode
 */

export class MockDataGenerator {
  private static names = [
    'Sarah Chen', 'Marcus Johnson', 'Emma Williams', 'James Rodriguez',
    'Olivia Taylor', 'Liam Anderson', 'Sophia Martinez', 'Noah Davis'
  ];

  private static companies = [
    'TechCorp', 'DataFlow Inc', 'CloudVentures', 'AI Dynamics',
    'DevTools Co', 'SaaSify', 'CodeCraft', 'ByteWorks'
  ];

  private static adjectives = [
    'Amazing', 'Incredible', 'Fantastic', 'Outstanding', 'Excellent',
    'Great', 'Wonderful', 'Superb', 'Brilliant', 'Perfect'
  ];

  static productAdjectives = [
    'Revolutionary', 'Innovative', 'Game-changing', 'Next-gen', 'Advanced',
    'Premium', 'Professional', 'Enterprise', 'Modern', 'Smart'
  ];

  static randomName(): string {
    return this.names[Math.floor(Math.random() * this.names.length)];
  }

  static randomCompany(): string {
    return this.companies[Math.floor(Math.random() * this.companies.length)];
  }

  static randomEmail(): string {
    const name = this.randomName().toLowerCase().replace(' ', '.');
    const domain = ['gmail.com', 'outlook.com', 'company.com'][Math.floor(Math.random() * 3)];
    return `${name}@${domain}`;
  }

  static randomDate(daysAgo: number = 30): Date {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysAgo);
    now.setDate(now.getDate() - randomDays);
    return now;
  }

  static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static randomPercentage(): number {
    return this.randomNumber(0, 100);
  }

  static randomGrowth(): number {
    return this.randomNumber(-20, 50);
  }

  static generateTweet(): {
    id: string;
    text: string;
    author: { name: string; username: string; avatar: string };
    createdAt: Date;
    likes: number;
    retweets: number;
    replies: number;
  } {
    const adjective = this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    const tweets = [
      `Just launched our new feature! ${adjective} response from the community 🚀`,
      `Working on something exciting. Can't wait to share it with you all! ✨`,
      `${adjective} day at the office. The team is crushing it! 💪`,
      `New blog post: "How we scaled to 1M users" - link in bio 📈`,
      `Thank you for 10k followers! This community is ${adjective.toLowerCase()} 🙏`,
    ];

    const name = this.randomName();
    const username = name.toLowerCase().replace(' ', '_');

    return {
      id: `tweet_${Date.now()}_${this.randomNumber(1000, 9999)}`,
      text: tweets[Math.floor(Math.random() * tweets.length)],
      author: {
        name,
        username: `@${username}`,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      },
      createdAt: this.randomDate(7),
      likes: this.randomNumber(10, 500),
      retweets: this.randomNumber(5, 100),
      replies: this.randomNumber(2, 50),
    };
  }

  static generateLinkedInPost(): {
    id: string;
    content: string;
    author: { name: string; title: string; company: string; avatar: string };
    createdAt: Date;
    likes: number;
    comments: number;
    shares: number;
  } {
    const adjective = this.productAdjectives[Math.floor(Math.random() * this.productAdjectives.length)];
    const posts = [
      `Excited to announce our ${adjective.toLowerCase()} new product launch! 🎉 #Innovation #Tech`,
      `3 key lessons from building a startup:\n1. Focus on the customer\n2. Ship fast\n3. Listen to feedback`,
      `We're hiring! Looking for talented engineers to join our growing team. DM for details.`,
      `Just published: "The Future of AI in Business" - thoughts in the comments 👇`,
      `Celebrating our team's achievements this quarter. Proud of what we've built together! 🏆`,
    ];

    const name = this.randomName();
    const company = this.randomCompany();

    return {
      id: `linkedin_${Date.now()}_${this.randomNumber(1000, 9999)}`,
      content: posts[Math.floor(Math.random() * posts.length)],
      author: {
        name,
        title: 'Product Manager',
        company,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      },
      createdAt: this.randomDate(14),
      likes: this.randomNumber(50, 1000),
      comments: this.randomNumber(5, 100),
      shares: this.randomNumber(2, 50),
    };
  }

  static generateAIResponse(prompt: string): {
    text: string;
    tokensUsed: number;
    model: string;
  } {
    const responses = [
      `Based on your request, I recommend the following approach: [Detailed analysis would go here in production mode]`,
      `Great question! Here are three key points to consider: 1) User experience 2) Performance 3) Scalability`,
      `I've analyzed your requirements and generated a comprehensive solution. The key features include...`,
      `Here's my suggestion: Focus on the core value proposition and iterate based on user feedback.`,
    ];

    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      tokensUsed: this.randomNumber(100, 500),
      model: 'gpt-4-turbo-preview',
    };
  }

  static generatePayment(): {
    id: string;
    amount: number;
    currency: string;
    customer: { name: string; email: string };
    status: 'succeeded' | 'pending' | 'failed';
    createdAt: Date;
  } {
    return {
      id: `pay_${this.randomNumber(100000, 999999)}`,
      amount: this.randomNumber(1000, 50000) / 100,
      currency: 'USD',
      customer: {
        name: this.randomName(),
        email: this.randomEmail(),
      },
      status: ['succeeded', 'succeeded', 'succeeded', 'pending'][Math.floor(Math.random() * 4)] as any,
      createdAt: this.randomDate(30),
    };
  }

  static generateEmail(): {
    id: string;
    from: string;
    to: string;
    subject: string;
    preview: string;
    createdAt: Date;
    read: boolean;
  } {
    const subjects = [
      'Welcome to our platform!',
      'Your weekly digest is ready',
      'Action required: Verify your email',
      'New feature announcement',
      'Invoice for your subscription',
    ];

    return {
      id: `email_${Date.now()}_${this.randomNumber(1000, 9999)}`,
      from: this.randomEmail(),
      to: this.randomEmail(),
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      preview: 'Thank you for being a valued customer. We have some exciting updates...',
      createdAt: this.randomDate(7),
      read: Math.random() > 0.3,
    };
  }

  static generateCalendarEvent(): {
    id: string;
    title: string;
    start: Date;
    end: Date;
    attendees: string[];
    location: string;
  } {
    const meetings = [
      'Team Standup',
      'Product Review',
      'Client Meeting',
      '1-on-1 with Manager',
      'Sprint Planning',
      'Design Review',
    ];

    const start = this.randomDate(14);
    const end = new Date(start);
    end.setHours(end.getHours() + 1);

    return {
      id: `event_${Date.now()}_${this.randomNumber(1000, 9999)}`,
      title: meetings[Math.floor(Math.random() * meetings.length)],
      start,
      end,
      attendees: Array(this.randomNumber(2, 5)).fill(0).map(() => this.randomEmail()),
      location: ['Office', 'Zoom', 'Google Meet', 'Conference Room A'][Math.floor(Math.random() * 4)],
    };
  }

  static generateAnalytics(): {
    pageViews: number;
    uniqueVisitors: number;
    bounceRate: number;
    avgSessionDuration: number;
    topPages: { path: string; views: number }[];
  } {
    return {
      pageViews: this.randomNumber(1000, 50000),
      uniqueVisitors: this.randomNumber(500, 20000),
      bounceRate: this.randomNumber(20, 60),
      avgSessionDuration: this.randomNumber(60, 300),
      topPages: [
        { path: '/', views: this.randomNumber(500, 5000) },
        { path: '/pricing', views: this.randomNumber(300, 3000) },
        { path: '/features', views: this.randomNumber(200, 2000) },
        { path: '/blog', views: this.randomNumber(100, 1000) },
      ],
    };
  }

  static generateChartData(days: number = 30): { date: string; value: number }[] {
    const data: { date: string; value: number }[] = [];
    const baseValue = this.randomNumber(100, 1000);

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const trend = (days - i) / days; // Growing trend
      const noise = (Math.random() - 0.5) * 0.2;
      const value = Math.floor(baseValue * (1 + trend + noise));

      data.push({
        date: date.toISOString().split('T')[0],
        value,
      });
    }

    return data;
  }

  static simulateDelay(ms: number = 1000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
