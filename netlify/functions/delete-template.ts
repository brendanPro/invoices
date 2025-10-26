import { Handler } from '@netlify/functions';
import { db } from '../lib/db';
import { blobs } from '../lib/blobs';
import type { ApiResponse } from '../../src/types/invoice';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const templateId = event.queryStringParameters?.id;
    
    if (!templateId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Template ID is required' }),
      };
    }

    const id = parseInt(templateId, 10);
    if (isNaN(id)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid template ID' }),
      };
    }

    // Get template to find blob key
    const template = await db.getTemplate(id);
    if (!template) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ success: false, error: 'Template not found' }),
      };
    }

    // Delete from database (cascade will handle template_fields)
    await db.deleteTemplate(id);

    // Delete from Netlify Blobs
    try {
      await blobs.deleteTemplate(template.blob_key);
    } catch (blobError) {
      console.warn('Failed to delete blob:', blobError);
      // Continue even if blob deletion fails
    }

    const response: ApiResponse = {
      success: true,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error deleting template:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(response),
    };
  }
};
