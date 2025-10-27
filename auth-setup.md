# Environment Variables Setup for Backend-Side OAuth Authentication

This document outlines the environment variables required for the Invoice Generator application with backend-handled Google OAuth 2.0 authentication.

## Required Environment Variables

### Google OAuth Configuration (Backend Only)

Add these environment variables to your Netlify site settings or `.env` file:

```bash
# Google OAuth Configuration (Backend)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-site.netlify.app/api/auth/callback

# JWT Secret for Custom Auth Tokens
JWT_SECRET=your_jwt_secret_here

# Frontend Configuration
BUN_PUBLIC_BACKEND_URL=https://your-site.netlify.app
BUN_PUBLIC_FRONTEND_URL=https://your-site.netlify.app

# Database Configuration (existing)
NETLIFY_DATABASE_URL=your_neon_database_url_here
```

## Google OAuth Setup

### 1. Create Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen
6. Add authorized redirect URIs:
   - For development: `http://localhost:8888/api/auth/callback`
   - For production: `https://your-site.netlify.app/api/auth/callback`

### 2. Configure OAuth Application

1. Set application type to "Web application"
2. Add authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: `https://your-site.netlify.app`
3. Add authorized redirect URIs (as mentioned above)
4. Copy the Client ID for your environment variables

## Environment Variable Sources

### Development (.env file)
Create a `.env` file in your project root:

```bash
# Backend OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:8888/api/auth/callback
JWT_SECRET=your_jwt_secret_key

# Email Whitelist (comma-separated list of authorized emails)
AUTHORIZED_EMAILS=user1@example.com,user2@example.com,admin@company.com

# Frontend Configuration
BUN_PUBLIC_BACKEND_URL=http://localhost:8888
BUN_PUBLIC_FRONTEND_URL=http://localhost:3000
NETLIFY_DATABASE_URL=your_neon_database_url
```

### Production (Netlify Site Settings)
Add environment variables in Netlify dashboard:
- Site settings → Environment variables
- Add each variable with its production value

## Security Notes

- Never commit `.env` files to version control
- Use different OAuth credentials for development and production
- Ensure your Google OAuth application has proper redirect URIs configured
- The OAuth flow uses PKCE (Proof Key for Code Exchange) for security
- Access tokens are stored securely in sessionStorage with expiration handling
- **Email Whitelist**: Only users with emails listed in `AUTHORIZED_EMAILS` can access the application
- If `AUTHORIZED_EMAILS` is not set, all emails are allowed (for development only)

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**
   - Check that your Google OAuth redirect URIs match exactly
   - Ensure the Netlify site URL is correct

2. **"Client ID not found" error**
   - Verify the Google Client ID is correct
   - Check that the OAuth application is properly configured

3. **Authentication not working in development**
   - Ensure `bun run dev` is running
   - Check that the Google Client ID is correctly set
   - Verify environment variables are loaded

### Testing Authentication

1. Start the development server: `bun run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Click "Continue with Google" to test OAuth flow
5. After successful login, you should be redirected to the dashboard

## Next Steps

After setting up the environment variables:

1. Deploy your site to Netlify
2. Configure the production environment variables
3. Test the authentication flow in production
4. Set up any additional OAuth providers if needed
