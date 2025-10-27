# Template API Documentation

## Overview

The Template API provides a consolidated endpoint for managing PDF templates in the invoice generation system. All template operations are handled through a single endpoint with different HTTP methods.

## Endpoint

```
/api/templates
```

## HTTP Methods

### GET - List Templates

Retrieves all available templates.

**Request:**
```http
GET /api/templates
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Invoice Template",
      "blob_key": "template_1234567890_abc123.pdf",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

### POST - Create Template

Uploads a new PDF template.

**Request:**
```http
POST /api/templates
Content-Type: application/json

{
  "name": "My Invoice Template",
  "fileData": "base64-encoded-pdf-data"
}
```

**Response:**
```json
{
  "success": true,
  "template": {
    "id": 1,
    "name": "My Invoice Template",
    "blob_key": "template_1234567890_abc123.pdf",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Name and file data are required"
}
```

### DELETE - Delete Template

Removes a template and its associated data.

**Request:**
```http
DELETE /api/templates?id=1
```

**Response:**
```json
{
  "success": true
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Template not found"
}
```

## Error Handling

All endpoints return consistent error responses with:
- `success`: boolean indicating operation success
- `error`: string describing the error (when success is false)

## HTTP Status Codes

- `200` - Success (GET, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `404` - Not Found (template doesn't exist)
- `405` - Method Not Allowed
- `500` - Internal Server Error

## CORS Support

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: Content-Type`
- `Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`

## Implementation Details

### File Storage
- Templates are stored in Netlify Blobs
- Each template gets a unique blob key
- Blob keys follow the pattern: `template_{timestamp}_{random}.pdf`

### Database Storage
- Template metadata is stored in PostgreSQL
- Includes name, blob key, and timestamps
- Cascade deletion removes associated field configurations

### Validation
- POST requests require both `name` and `fileData`
- DELETE requests require a valid template `id`
- File data must be base64-encoded PDF content

## Usage Examples

### JavaScript/TypeScript

```typescript
// List templates
const templates = await fetch('/api/templates').then(r => r.json());

// Upload template
const formData = new FormData();
formData.append('file', pdfFile);
const base64 = await new Promise(resolve => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.readAsDataURL(pdfFile);
});

const uploadResponse = await fetch('/api/templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Template',
    fileData: base64
  })
});

// Delete template
const deleteResponse = await fetch('/api/templates?id=1', {
  method: 'DELETE'
});
```

### cURL

```bash
# List templates
curl -X GET /api/templates

# Upload template
curl -X POST /api/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"My Template","fileData":"base64-data"}'

# Delete template
curl -X DELETE "/api/templates?id=1"
```
