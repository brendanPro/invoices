import { Handler } from '@netlify/functions';
import { db } from '../lib/db';
import { blobs } from '../lib/blobs';
import type { ApiResponse, CreateTemplateResponse } from '../../src/types/invoice';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Content-Type must be multipart/form-data' }),
      };
    }

    // For now, we'll expect the data to be base64 encoded in the body
    // In a real implementation, you'd use a multipart parser like busboy
    const body = JSON.parse(event.body || '{}');
    const { name, fileData } = body;

    if (!name || !fileData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Name and file data are required' }),
      };
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(fileData, 'base64');
    
    // Generate unique blob key
    const blobKey = `template_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;

    // Upload to Netlify Blobs
    await blobs.uploadTemplate(blobKey, buffer);

    // Save template metadata to database
    const template = await db.createTemplate(name, blobKey);

    const response: CreateTemplateResponse = {
      success: true,
      template,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error uploading template:', error);
    
    const response: CreateTemplateResponse = {
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
