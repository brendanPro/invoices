import { Handler } from '@netlify/functions';
import { db } from '../lib/db';
import type { ApiResponse, TemplateField } from '../../src/types/invoice';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const templateId = event.queryStringParameters?.template_id;
    
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

    const fields = await db.getTemplateFields(id);

    const response: ApiResponse<TemplateField[]> = {
      success: true,
      data: fields,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error getting configuration:', error);
    
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
