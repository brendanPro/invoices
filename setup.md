# Setup Instructions

## 1. Database Setup

1. Create a PostgreSQL database (recommended providers):
   - [Supabase](https://supabase.com) (free tier available)
   - [Neon](https://neon.tech) (free tier available)
   - [Railway](https://railway.app) (free tier available)
   - Local PostgreSQL installation

2. Run the database schema:
   ```sql
   -- Copy and run the contents of database/schema.sql in your database
   ```

## 2. Environment Variables

Set the following environment variable in your Netlify site settings:

```
NETLIFY_DATABASE_URL=postgresql://username:password@host:port/database
```

### API Configuration

The API base URL is configured in `src/lib/api.ts`:

- **Local Development**: Defaults to `http://localhost:9999` (no changes needed)
- **Production**: Update `src/lib/api.ts` to use your Netlify site URL

### Example connection strings:

**Supabase:**
```
NETLIFY_DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

**Neon:**
```
NETLIFY_DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Railway:**
```
NETLIFY_DATABASE_URL=postgresql://postgres:[password]@[host]:5432/railway
```

## 3. Local Development

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start development server:
   ```bash
   bun run dev
   ```

3. For local Netlify Functions testing:
   ```bash
   # Install Netlify CLI globally
   npm install -g netlify-cli
   
   # Start local development with functions
   netlify dev
   ```

## 4. Deployment

1. Connect your repository to Netlify
2. Set build settings:
   - Build command: `bun run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
3. Add the environment variable:
   - `NETLIFY_DATABASE_URL` - Your PostgreSQL connection string
4. Update `src/lib/api.ts` with your production URL
5. Deploy!

## 5. Usage

1. **Upload Template**: Upload a PDF template file
2. **Configure Fields**: Define text fields with X/Y coordinates
3. **Generate Invoice**: Fill in data and generate the PDF

## Troubleshooting

- Ensure `NETLIFY_DATABASE_URL` is correctly set
- Verify API base URL in `src/lib/api.ts` matches your environment
- Check Netlify Functions logs for errors
- Verify database tables were created correctly
- Test PDF upload with small files first
