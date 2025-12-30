# Authentication Setup Guide

This guide will help you set up Google and GitHub OAuth for AutoForge.

## Prerequisites

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```
   Add this to your `.env` file.

---

## Google OAuth Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in the required fields:
   - **App name**: AutoForge
   - **User support email**: your-email@example.com
   - **Developer contact**: your-email@example.com
4. Add scopes: `email`, `profile`, `openid`
5. Add test users (for development)

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application**
4. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
5. Copy the **Client ID** and **Client Secret**
6. Add them to your `.env` file:
   ```
   GOOGLE_CLIENT_ID="your-client-id-here"
   GOOGLE_CLIENT_SECRET="your-client-secret-here"
   ```

---

## GitHub OAuth Setup

### 1. Register a New OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: AutoForge
   - **Homepage URL**: `http://localhost:3000` (development)
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Click **Register application**

### 2. Generate Client Secret

1. Click **Generate a new client secret**
2. Copy the **Client ID** and **Client Secret**
3. Add them to your `.env` file:
   ```
   GITHUB_CLIENT_ID="your-client-id-here"
   GITHUB_CLIENT_SECRET="your-client-secret-here"
   ```

---

## Testing Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/login`

3. Try signing in with Google or GitHub

4. Check for any errors in:
   - Browser console
   - Terminal/server logs
   - Network tab (for OAuth redirects)

---

## Common Issues

### "Configuration Error" on Sign In

**Problem**: OAuth providers not configured correctly

**Solution**:
- Check that all environment variables are set in `.env`
- Verify callback URLs match exactly (including trailing slashes)
- Ensure OAuth consent screen is properly configured

### "OAuthAccountNotLinked" Error

**Problem**: Email is already registered with a different provider

**Solution**:
- Sign in using the original provider
- Or contact support to link accounts

### Redirect Not Working

**Problem**: Callback URL mismatch

**Solution**:
- Check authorized redirect URIs in Google/GitHub settings
- Verify `NEXTAUTH_URL` in `.env` matches your domain
- For development, must be `http://localhost:3000`
- For production, must be `https://yourdomain.com`

---

## Production Deployment

When deploying to production:

1. Update redirect URIs in Google/GitHub to use your production domain
2. Set `NEXTAUTH_URL` to your production URL
3. Use environment-specific OAuth apps (separate dev/prod)
4. Never commit `.env` to git (it's in `.gitignore`)

---

## Security Best Practices

1. **Rotate secrets regularly** - Change `NEXTAUTH_SECRET` periodically
2. **Use separate OAuth apps** - Different apps for dev/staging/production
3. **Monitor OAuth usage** - Check Google/GitHub dashboards for suspicious activity
4. **Limit scopes** - Only request necessary permissions (email, profile)
5. **Enable 2FA** - On your Google/GitHub accounts used for OAuth apps

---

## Support

If you continue having issues:
1. Check server logs for detailed error messages
2. Verify database connection is working
3. Ensure Prisma schema is up to date: `npx prisma db push`
4. Contact support at: support@autoforge.dev
