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
DATABASE_URL=postgresql://username:password@host:port/database
```

### Example connection strings:

**Supabase:**
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

**Neon:**
```
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Railway:**
```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/railway
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
3. Add the `DATABASE_URL` environment variable
4. Deploy!

## 5. Usage

1. **Upload Template**: Upload a PDF template file
2. **Configure Fields**: Define text fields with X/Y coordinates
3. **Generate Invoice**: Fill in data and generate the PDF

## Troubleshooting

- Ensure `DATABASE_URL` is correctly set
- Check Netlify Functions logs for errors
- Verify database tables were created correctly
- Test PDF upload with small files first
