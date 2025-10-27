# Environment Variables Setup

## For Local Development

The default configuration is set for local development. No changes needed!

The API base URL is configured in `src/lib/api.ts` and defaults to `http://localhost:9999`.

## For Production

To deploy to production, update the API configuration:

1. Open `src/lib/api.ts`
2. Change the `BASE_URL` from `http://localhost:9999` to your Netlify site URL:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://your-site-name.netlify.app',
};
```

## Alternative: Environment Variable Approach

If you prefer using environment variables, you can modify `src/lib/api.ts` to use:

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.API_BASE_URL || 'http://localhost:9999',
};
```

Then set `API_BASE_URL` in your environment.

## How It Works

The application uses the `API_CONFIG.BASE_URL` to determine the backend URL:

- **Local Development**: `http://localhost:9999` (Netlify Dev)
- **Production**: `https://your-site-name.netlify.app` (Your deployed site)

## API Endpoints

All API calls are automatically configured based on the base URL:

### Template Management (REST API)
- **GET** `/api/templates` - List all templates
- **POST** `/api/templates` - Create new template
- **DELETE** `/api/templates?id={id}` - Delete template by ID
- **GET** `/api/templates?id={id}` - Get single template by ID

### Configuration Management
- **POST** `/api/save-configuration` - Save template field configuration
- **GET** `/api/get-configuration?template_id={id}` - Get template configuration

### Invoice Generation
- **POST** `/api/generate-invoice` - Generate invoice PDF
