import { Handler } from '@netlify/functions';
import { db } from '../lib/db';
import type { ApiResponse, TemplateField, CreateTemplateFieldRequest, UpdateTemplateFieldRequest } from '../../src/types/invoice';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, PUT, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  if (!['POST', 'PUT'].includes(event.httpMethod)) {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      // Create new template field
      const fieldData: CreateTemplateFieldRequest = body;
      
      if (!fieldData.template_id || !fieldData.field_name || 
          fieldData.x_position === undefined || fieldData.y_position === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Missing required fields' }),
        };
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

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(response),
      };
    } else {
      // Update existing template field
      const fieldData: UpdateTemplateFieldRequest = body;
      
      if (!fieldData.field_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Field ID is required' }),
        };
      }

      const updateData: any = {};
      if (fieldData.field_name !== undefined) updateData.field_name = fieldData.field_name;
      if (fieldData.x_position !== undefined) updateData.x_position = fieldData.x_position;
      if (fieldData.y_position !== undefined) updateData.y_position = fieldData.y_position;
      if (fieldData.font_size !== undefined) updateData.font_size = fieldData.font_size;
      if (fieldData.field_type !== undefined) updateData.field_type = fieldData.field_type;

      if (Object.keys(updateData).length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'No fields to update' }),
        };
      }

      const field = await db.updateTemplateField(fieldData.field_id, updateData);

      const response: ApiResponse<TemplateField> = {
        success: true,
        data: field,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    }
  } catch (error) {
    console.error('Error saving configuration:', error);
    
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
