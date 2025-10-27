import { db } from '../../lib/db';
import type { ApiResponse, TemplateField, CreateTemplateFieldRequest, UpdateTemplateFieldRequest } from '../../../src/types/invoice';

export const config = {
  path: '/api/save-configuration',
};

export default async (req: Request, context: any) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, DELETE, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const body = await req.json();

    if (req.method === 'POST') {
      // Create new template field
      const fieldData: CreateTemplateFieldRequest = body;
      
      if (!fieldData.template_id || !fieldData.field_name || 
          fieldData.x_position === undefined || fieldData.y_position === undefined) {
        return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      const field = await db.createTemplateField(fieldData.template_id, {
        field_name: fieldData.field_name,
        x_position: fieldData.x_position,
        y_position: fieldData.y_position,
        font_size: fieldData.font_size,
        field_type: fieldData.field_type,
      });

      const response: ApiResponse<TemplateField> = {
        success: true,
        data: field,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } else if (req.method === 'PUT') {
      // Update existing template field
      const fieldData: UpdateTemplateFieldRequest = body;
      
      if (!fieldData.field_id) {
        return new Response(JSON.stringify({ success: false, error: 'Field ID is required' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      const updateData: any = {};
      if (fieldData.field_name !== undefined) updateData.field_name = fieldData.field_name;
      if (fieldData.x_position !== undefined) updateData.x_position = fieldData.x_position;
      if (fieldData.y_position !== undefined) updateData.y_position = fieldData.y_position;
      if (fieldData.font_size !== undefined) updateData.font_size = fieldData.font_size;
      if (fieldData.field_type !== undefined) updateData.field_type = fieldData.field_type;

      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'No fields to update' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      const field = await db.updateTemplateField(fieldData.field_id, updateData);

      const response: ApiResponse<TemplateField> = {
        success: true,
        data: field,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } else if (req.method === 'DELETE') {
      // Delete template field
      const { field_id } = body;
      
      if (!field_id) {
        return new Response(JSON.stringify({ success: false, error: 'Field ID is required' }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }

      await db.deleteTemplateField(field_id);

      const response: ApiResponse = {
        success: true,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Error saving configuration:', error);
    
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