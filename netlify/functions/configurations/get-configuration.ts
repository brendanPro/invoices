import { db } from '../../lib/db';
import type { ApiResponse, TemplateField } from '../../../src/types/invoice';

export const config = {
  path: '/api/get-configuration',
};

export default async (req: Request, context: any) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const url = new URL(req.url);
    const templateId = url.searchParams.get('template_id');
    
    if (!templateId) {
      return new Response(JSON.stringify({ success: false, error: 'Template ID is required' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const id = parseInt(templateId, 10);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid template ID' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const fields = await db.getTemplateFields(id);

    const response: ApiResponse<TemplateField[]> = {
      success: true,
      data: fields,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error getting configuration:', error);
    
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};