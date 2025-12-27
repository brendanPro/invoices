# AGENTS.md

## Project Overview

This is an invoice generation system built with React, TypeScript, Netlify Functions, and PostgreSQL. The application allows users to upload PDF templates, configure field positions on those templates, and generate invoices by filling in those fields with data.

**Tech Stack:**
- **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI
- **Backend**: Netlify Functions 2.0 (serverless)
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Netlify Blobs for PDF files
- **Runtime**: Bun (package manager and build tool)
- **PDF Processing**: pdf-lib and pdfjs-dist

## Setup Commands

### Initial Setup
```bash
# Install dependencies
bun install

# Set up environment variables (see Environment Variables section below)
# Copy DATABASE_URL to Netlify environment or .env file
```

### Development
```bash
# Start frontend dev server with hot reload
bun run dev

# Start Netlify Functions locally (includes frontend + functions)
netlify dev

# Production mode
NODE_ENV=production bun start
```

### Database Operations
```bash
# Generate new migration files
bun run db:generate

# Run migrations (requires Netlify CLI context)
bun run db:migrate

# Open Drizzle Studio for database management
bun run db:studio
```

### Build
```bash
# Build for production
bun run build

# Format code with Prettier
bun run format

# Check formatting without changes
bun run format:check
```

## Environment Variables

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string (format: `postgresql://username:password@host:port/database`)

Set these in:
- **Local development**: `.env` file or via `netlify dev`
- **Production**: Netlify site settings → Environment Variables

## Code Style

### TypeScript
- Strict null checks enabled
- Use path aliases for imports:
  - `@/*` for `./src/*`
  - `@netlify/*` for `./netlify/*`
  - `@types/*` for `./types/*`
  - `@db/*` for `./db/*`
- JSX set to `react-jsx`
- Module resolution set to `bundler` mode

### Formatting
- Use Prettier for all formatting
- Run `bun run format` before committing
- Check with `bun run format:check` in CI/CD

### Code Organization
- **Frontend code**: `/src` directory
  - Components in `/src/components` organized by feature
  - Pages in `/src/pages`
  - Hooks in `/src/hooks`
  - Types in `/src/types`
  - API client in `/src/lib/api.ts`
- **Backend code**: `/netlify` directory
  - Functions in `/netlify/functions` (organized by feature)
  - Each feature has: controller, service, repository, and tests
  - Shared middleware in `/netlify/lib`
- **Database**: `/db` directory
  - Schema in `/db/schema.ts`
  - Migrations in `/db/migrations`

### Architecture Patterns
- **Dependency Injection**: Services receive repositories via constructor
- **Repository Pattern**: Data access layer abstracted through interfaces
- **Controller Pattern**: HTTP handlers delegate to services
- **Type Safety**: Shared types between frontend and backend in `/types`

## API Structure

### Netlify Functions 2.0
Functions use custom URL paths defined in function config:
- Format: `config.path = "/api/endpoint"`
- HTTP handler pattern for routing (see `/netlify/lib/http-handler.ts`)
- Auth middleware available at `/netlify/lib/auth-middleware.ts`

### Current Endpoints
- **Templates**: `/api/templates` (GET, POST, DELETE)
- **Fields**: `/api/fields` (GET, POST, PUT, DELETE)
- **Invoices**: `/api/invoices` (GET, POST, DELETE)
- **PDF Generation**: `/api/pdf/generate` (POST)
- **Auth**: `/api/auth/callback` (GET)

### Adding New Endpoints
1. Create function file in `/netlify/functions/{feature}/{feature}.mts`
2. Set `config.path = "/api/{endpoint}"`
3. Use http-handler pattern for clean routing
4. Follow controller → service → repository pattern
5. Add types to `/types` directory

## Database Schema

### Tables
- `templates`: PDF template metadata
- `template_fields`: Field configurations (x, y positions, fonts)
- `invoices`: Generated invoice records

### Working with Database
- Schema defined in `/db/schema.ts` using Drizzle ORM
- Use Drizzle Studio (`bun run db:studio`) to inspect data
- Run migrations after schema changes: `bun run db:generate && bun run db:migrate`
- Database client initialized in `/db/index.ts`

## PDF Processing

### Coordinate System
- PDF coordinates start from **bottom-left corner**
- X increases to the right, Y increases upward
- Font size affects vertical positioning

### Field Types
- `text`: Regular text input
- `number`: Numeric values
- `date`: Date strings

### Libraries
- **pdf-lib**: PDF manipulation and text overlay
- **pdfjs-dist**: PDF rendering for preview

## Testing

Currently no automated tests are defined. When adding tests:
- Use the `*test.ts` naming convention (following existing pattern in `/netlify/*/**.test.ts`)
- Consider adding Vitest or Bun's built-in test runner
- Update package.json with test script
- Add test command to this file

## State Management

- **TanStack Query**: Server state management
- **React Hook Form**: Form state with Zod validation
- **Auth Context**: User authentication state
- **TanStack Router**: Routing and navigation

## Common Tasks

### Adding a New Feature Module
1. Create directory in `/netlify/{feature}`
2. Add interface files: `I{Feature}Service.ts`, `I{Feature}Repository.ts`
3. Implement: `{feature}.service.ts`, `{feature}.repository.ts`, `{feature}.controller.ts`
4. Add function handler in `/netlify/functions/{feature}/{feature}.mts`
5. Create frontend types in `/src/types/{feature}.ts`
6. Add React components in `/src/components/{feature}/`
7. Add API client methods in `/src/lib/api.ts`
8. Create custom hooks in `/src/hooks/use{Feature}.ts`

### Debugging Netlify Functions
- Check function logs: `netlify functions:log`
- Use `netlify dev` for local testing
- Logs appear in Netlify dashboard under Functions tab
- Add console.log statements liberally during development

### Database Migrations
1. Update schema in `/db/schema.ts`
2. Generate migration: `bun run db:generate`
3. Review generated SQL in `/db/migrations`
4. Apply migration: `bun run db:migrate`
5. Commit both schema.ts and migration files

## Deployment

### Netlify Configuration
- Build command: `bun run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions` (auto-detected)
- Node version: 18 (specified in netlify.toml)

### Pre-deployment Checklist
1. Run `bun run format:check`
2. Ensure all environment variables are set in Netlify
3. Test locally with `netlify dev`
4. Verify database migrations are applied
5. Check that all new blobs/files are properly stored

## Security Considerations

- All authenticated endpoints should use auth middleware
- Database credentials stored in environment variables only
- Never commit `.env` files
- Netlify Blobs are private by default
- JWT tokens for authentication (validate on each request)

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Verify `DATABASE_URL` is set correctly
- Check database is accessible from your network
- Ensure PostgreSQL version compatibility

**PDF Upload/Generation Issues:**
- Check Netlify Blobs quota and permissions
- Verify PDF is valid format (not corrupted)
- Check console for coordinate calculation errors

**Build Failures:**
- Clear `node_modules`: `rm -rf node_modules && bun install`
- Check for TypeScript errors: `bun --bun tsc --noEmit`
- Ensure all path aliases resolve correctly

**Netlify Functions Not Working Locally:**
- Restart `netlify dev`
- Check function config exports are correct
- Verify `config.path` is set properly
- Check Netlify CLI version: `netlify --version`

## Resources

- [Netlify Functions 2.0 Docs](https://docs.netlify.com/functions/get-started/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Bun Documentation](https://bun.sh/docs)
- [pdf-lib Documentation](https://pdf-lib.js.org/)
- [TanStack Query Docs](https://tanstack.com/query/latest)

## Notes for AI Agents

- This codebase uses Bun, not Node.js or npm
- Always use `bun` commands instead of `npm` or `yarn`
- Path aliases are configured; use them for imports
- Follow the existing pattern: controller → service → repository
- HTTP handlers use a custom routing utility (http-handler.ts)
- Database operations go through Drizzle ORM repositories
- Frontend and backend share types from `/types` directory
- All PDF operations should handle coordinates relative to bottom-left origin

