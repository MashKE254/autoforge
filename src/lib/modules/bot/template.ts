/**
 * Bot Module Templates
 *
 * Code templates for chat bots (Discord, Slack, Telegram, WhatsApp, Twitter)
 */

export const botTemplates = {
  // Discord Bot with slash commands
  discordBot: `import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows available commands'),
].map(command => command.toJSON());

// Register slash commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();

client.on('ready', () => {
  console.log(\`Logged in as \${client.user?.tag}!\`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (commandName === 'help') {
    await interaction.reply('Available commands:\\n/ping - Check bot status\\n/help - Show this message');
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === '!hello') {
    await message.reply('Hello! 👋');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);

export { client };
`,

  // Slack Bot with Bolt framework
  slackBot: `import { App, ExpressReceiver } from '@slack/bolt';

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: false,
});

// Listen for slash commands
app.command('/hello', async ({ command, ack, respond }) => {
  await ack();
  await respond(\`Hello <@\${command.user_id}>! 👋\`);
});

app.command('/help', async ({ command, ack, respond }) => {
  await ack();
  await respond({
    text: 'Available commands:',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Available Commands:*\\n' +
                '• \`/hello\` - Get a greeting\\n' +
                '• \`/help\` - Show this message',
        },
      },
    ],
  });
});

// Listen for messages in channels
app.message('hello', async ({ message, say }) => {
  await say(\`Hello <@\${message.user}>!\`);
});

// Listen for app mentions
app.event('app_mention', async ({ event, say }) => {
  await say(\`Hi <@\${event.user}>! You mentioned me in <#\${event.channel}>.\`);
});

// Listen for button clicks
app.action('button_click', async ({ body, ack, say }) => {
  await ack();
  await say(\`<@\${body.user.id}> clicked the button!\`);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log('⚡️ Slack bot is running!');
})();

export { app, receiver };
`,

  // Telegram Bot with Telegraf
  telegramBot: `import { Telegraf, Markup } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// Start command
bot.command('start', (ctx) => {
  ctx.reply(
    'Welcome! 🎉\\n\\nI can help you with various tasks. Use /help to see available commands.',
    Markup.keyboard([
      ['📊 Status', '❓ Help'],
      ['⚙️ Settings'],
    ]).resize()
  );
});

// Help command
bot.command('help', (ctx) => {
  const helpText = \`
*Available Commands:*

/start - Start the bot
/help - Show this help message
/status - Check bot status
/settings - Configure settings

You can also send me messages and I'll respond!
  \`;
  ctx.replyWithMarkdownV2(helpText.replace(/[-.!()]/g, '\\\\$&'));
});

// Status command
bot.command('status', (ctx) => {
  ctx.reply('✅ Bot is running and healthy!');
});

// Settings command with inline keyboard
bot.command('settings', (ctx) => {
  ctx.reply(
    'Choose a setting:',
    Markup.inlineKeyboard([
      [Markup.button.callback('🔔 Notifications', 'settings_notifications')],
      [Markup.button.callback('🌙 Dark Mode', 'settings_theme')],
      [Markup.button.callback('🔙 Back', 'settings_back')],
    ])
  );
});

// Handle button callbacks
bot.action('settings_notifications', (ctx) => {
  ctx.answerCbQuery('Notifications toggled!');
  ctx.editMessageText('Notifications have been updated.');
});

bot.action('settings_theme', (ctx) => {
  ctx.answerCbQuery('Theme changed!');
  ctx.editMessageText('Theme has been changed to dark mode.');
});

// Handle text messages
bot.on('text', (ctx) => {
  const text = ctx.message.text.toLowerCase();

  if (text.includes('hello') || text.includes('hi')) {
    ctx.reply(\`Hello \${ctx.from.first_name}! 👋\`);
  } else {
    ctx.reply(\`You said: "\${ctx.message.text}"\`);
  }
});

// Handle photos
bot.on('photo', (ctx) => {
  ctx.reply('Nice photo! 📸');
});

// Error handling
bot.catch((err, ctx) => {
  console.error(\`Error for \${ctx.updateType}\`, err);
  ctx.reply('Sorry, an error occurred.');
});

bot.launch();
console.log('🤖 Telegram bot is running!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot };
`,

  // Discord API route
  discordApiRoute: `import { NextRequest, NextResponse } from 'next/server';
import { verifyKey } from 'discord-interactions';

export async function POST(req: NextRequest) {
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const body = await req.text();

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  const isValid = verifyKey(
    body,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle ping (required by Discord)
  if (interaction.type === 1) {
    return NextResponse.json({ type: 1 });
  }

  // Handle slash commands
  if (interaction.type === 2) {
    const { name } = interaction.data;

    if (name === 'ping') {
      return NextResponse.json({
        type: 4,
        data: {
          content: 'Pong! 🏓',
        },
      });
    }

    if (name === 'help') {
      return NextResponse.json({
        type: 4,
        data: {
          content: 'Available commands:\\n/ping - Check bot status\\n/help - Show this message',
        },
      });
    }
  }

  return NextResponse.json({ error: 'Unknown interaction' }, { status: 400 });
}
`,

  // Slack API route
  slackApiRoute: `import { NextRequest, NextResponse } from 'next/server';
import { app, receiver } from '@/lib/bot/slack';

export async function POST(req: NextRequest) {
  return receiver.requestHandler(req as any, {} as any);
}
`,

  // Telegram webhook route
  telegramApiRoute: `import { NextRequest, NextResponse } from 'next/server';
import { bot } from '@/lib/bot/telegram';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
`,

  // Bot environment variables
  envTemplate: `# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_PUBLIC_KEY=your_discord_public_key

# Slack Bot
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your_slack_signing_secret
SLACK_APP_TOKEN=xapp-your-slack-app-token

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/bot/telegram
`,

  // TypeScript types
  types: `export interface BotCommand {
  name: string;
  description: string;
  handler: (ctx: any) => Promise<void>;
}

export interface BotConfig {
  platform: 'discord' | 'slack' | 'telegram';
  token: string;
  commands: BotCommand[];
}

export interface DiscordInteraction {
  type: number;
  data?: {
    name: string;
    options?: any[];
  };
  member?: {
    user: {
      id: string;
      username: string;
    };
  };
}

export interface SlackCommand {
  command: string;
  text: string;
  user_id: string;
  channel_id: string;
}

export interface TelegramUpdate {
  message?: {
    chat: {
      id: number;
    };
    from: {
      first_name: string;
      id: number;
    };
    text: string;
  };
  callback_query?: {
    data: string;
    from: {
      id: number;
    };
  };
}
`,
};
