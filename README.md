# Invoice Generator Tool

A full-stack invoice generation system built with React, Netlify Functions, PostgreSQL, and Netlify Blobs.

## Features

- **PDF Template Upload**: Upload PDF templates to Netlify Blobs
- **Field Configuration**: Define text fields with precise X/Y coordinates on templates
- **Dynamic Invoice Generation**: Generate invoices by filling configured fields with data
- **Template Management**: List, select, and delete templates
- **Real-time Preview**: View generated invoices in the browser

## Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, and Radix UI components
- **Backend**: Netlify Functions (serverless)
- **Database**: PostgreSQL for metadata and configurations
- **File Storage**: Netlify Blobs for PDF templates
- **PDF Processing**: pdf-lib for PDF manipulation and overlay

## Setup Instructions

### 1. Database Setup

1. Create a PostgreSQL database (local or cloud provider like Supabase, Neon, etc.)
2. Run the schema from `database/schema.sql` to create the required tables
3. Set the `DATABASE_URL` environment variable in your Netlify site settings

### 2. Environment Variables

Set these environment variables in your Netlify site settings:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

### 3. Local Development

1. Install dependencies:
   ```bash
   bun install
   ```

2. Start the development server:
   ```bash
   bun run dev
   ```

3. For local Netlify Functions development, install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   netlify dev
   ```

### 4. Deployment

1. Connect your repository to Netlify
2. Set the build command: `bun run build`
3. Set the publish directory: `dist`
4. Set the functions directory: `netlify/functions`
5. Add the `DATABASE_URL` environment variable

## Usage

### 1. Upload a Template

1. Click "Upload Template" and select a PDF file
2. Enter a name for your template
3. The template will be stored in Netlify Blobs

### 2. Configure Fields

1. Select a template from the list
2. Add fields by specifying:
   - Field name (e.g., "customer_name")
   - X and Y coordinates (in PDF points)
   - Font size
   - Field type (text, number, date)

### 3. Generate Invoices

1. Select the configured template
2. Fill in the invoice data form with the required information
3. Click "Generate Invoice" to create the PDF
4. View or download the generated invoice

## API Endpoints

- `POST /api/upload-template` - Upload a PDF template
- `GET /api/list-templates` - List all templates
- `DELETE /api/delete-template` - Delete a template
- `POST /api/save-configuration` - Save field configuration
- `GET /api/get-configuration` - Get field configuration
- `POST /api/generate-invoice` - Generate invoice PDF

## Database Schema

### Tables

- `templates` - Template metadata
- `template_fields` - Field configurations for each template
- `invoices` - Generated invoice records

### Key Fields

- Templates: `id`, `name`, `blob_key`, `created_at`, `updated_at`
- Template Fields: `id`, `template_id`, `field_name`, `x_position`, `y_position`, `font_size`, `field_type`
- Invoices: `id`, `template_id`, `invoice_data`, `generated_at`, `pdf_blob_key`

## Technical Details

### PDF Overlay Process

1. Load the template PDF using pdf-lib
2. For each configured field, draw text at the specified coordinates
3. Save the modified PDF and return as base64 data URL

### Coordinate System

- PDF coordinates start from the bottom-left corner
- X increases to the right, Y increases upward
- The system automatically adjusts Y coordinates to account for font size

### Field Types

- `text`: Regular text input
- `number`: Numeric input with decimal support
- `date`: Date input (formatted as string)

## Development Notes

- Uses Bun as the package manager and runtime
- Form validation with Zod and react-hook-form
- TypeScript for type safety
- Tailwind CSS for styling
- Radix UI for accessible components

## Troubleshooting

### Common Issues

1. **Database Connection**: Ensure `DATABASE_URL` is correctly set
2. **PDF Upload**: Check file size limits and PDF format
3. **Field Positioning**: Use PDF viewer to determine accurate coordinates
4. **CORS Issues**: Ensure API endpoints are properly configured

### Debugging

- Check Netlify Functions logs in the Netlify dashboard
- Use browser developer tools to inspect API responses
- Verify database connectivity and table structure