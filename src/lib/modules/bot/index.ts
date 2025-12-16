/**
 * Bot Module
 *
 * Provides chat bot integration for Discord, Slack, Telegram, WhatsApp, and Twitter
 */

import { botTemplates } from './template';

export type BotPlatform = 'discord' | 'slack' | 'telegram' | 'whatsapp' | 'twitter';

export interface BotModuleConfig {
  platforms: BotPlatform[];
  features?: Array<'slash-commands' | 'message-handling' | 'webhooks' | 'buttons' | 'inline-keyboards'>;
}

export interface BotModuleOutput {
  files: Array<{ path: string; content: string }>;
  envVars: string[];
  dependencies: string[];
  instructions: string[];
}

/**
 * Generate bot integration files
 */
export function generateBotModule(config: BotModuleConfig): BotModuleOutput {
  const files: Array<{ path: string; content: string }> = [];
  const envVars: string[] = [];
  const dependencies: string[] = [];
  const instructions: string[] = [];

  // Discord Bot
  if (config.platforms.includes('discord')) {
    files.push(
      { path: 'lib/bot/discord.ts', content: botTemplates.discordBot },
      { path: 'app/api/bot/discord/route.ts', content: botTemplates.discordApiRoute },
      { path: 'lib/bot/types.ts', content: botTemplates.types }
    );

    dependencies.push('discord.js');
    envVars.push('DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_PUBLIC_KEY');

    instructions.push(
      'Create a Discord bot at https://discord.com/developers/applications',
      'Enable MESSAGE CONTENT INTENT in Bot settings',
      'Copy the bot token to DISCORD_BOT_TOKEN',
      'Copy the application ID to DISCORD_CLIENT_ID',
      'Copy the public key to DISCORD_PUBLIC_KEY',
      'Invite the bot to your server using OAuth2 URL Generator'
    );
  }

  // Slack Bot
  if (config.platforms.includes('slack')) {
    files.push(
      { path: 'lib/bot/slack.ts', content: botTemplates.slackBot },
      { path: 'app/api/bot/slack/route.ts', content: botTemplates.slackApiRoute }
    );

    dependencies.push('@slack/bolt');
    envVars.push('SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET', 'SLACK_APP_TOKEN');

    instructions.push(
      'Create a Slack app at https://api.slack.com/apps',
      'Enable Socket Mode in your app settings',
      'Add Bot Token Scopes: chat:write, commands, app_mentions:read',
      'Install the app to your workspace',
      'Copy the Bot User OAuth Token to SLACK_BOT_TOKEN',
      'Copy the Signing Secret to SLACK_SIGNING_SECRET',
      'Generate an App-Level Token with connections:write scope for SLACK_APP_TOKEN'
    );
  }

  // Telegram Bot
  if (config.platforms.includes('telegram')) {
    files.push(
      { path: 'lib/bot/telegram.ts', content: botTemplates.telegramBot },
      { path: 'app/api/bot/telegram/route.ts', content: botTemplates.telegramApiRoute }
    );

    dependencies.push('telegraf');
    envVars.push('TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_URL');

    instructions.push(
      'Create a Telegram bot by messaging @BotFather on Telegram',
      'Send /newbot to @BotFather and follow the instructions',
      'Copy the bot token to TELEGRAM_BOT_TOKEN',
      'Set webhook URL: https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_WEBHOOK_URL>',
      'Replace <TOKEN> with your bot token and <YOUR_WEBHOOK_URL> with your endpoint'
    );
  }

  return {
    files,
    envVars,
    dependencies,
    instructions,
  };
}

/**
 * Get bot module prompt for AI generation
 */
export function getBotModulePrompt(config: BotModuleConfig): string {
  return `
## Bot Module

Include chat bot integration for the following platforms:
${config.platforms.map(p => `- ${p.toUpperCase()}`).join('\n')}

### Features:
${config.features?.map(f => `- ${f}`).join('\n') || '- Slash commands\n- Message handling\n- Interactive buttons'}

${config.platforms.includes('discord') ? `
### Discord Bot Features:
- Slash command registration
- Message event handling
- Command handlers (/ping, /help)
- Direct message support
- Server permission handling
- Rich embeds and buttons
` : ''}

${config.platforms.includes('slack') ? `
### Slack Bot Features:
- Slash command handling
- Interactive messages with buttons
- App mentions detection
- Direct message support
- Block Kit UI components
- Event subscriptions
` : ''}

${config.platforms.includes('telegram') ? `
### Telegram Bot Features:
- Command handlers (/start, /help, /status)
- Inline keyboards for interactive menus
- Callback query handling
- Text, photo, and file message support
- Custom keyboards
- Webhook integration
` : ''}

### Environment Variables:
${envVars.join('\n')}

### Setup Instructions:
${instructions.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

### Dependencies:
${dependencies.map(d => `- ${d}`).join('\n')}
`;
}

export { botTemplates };
