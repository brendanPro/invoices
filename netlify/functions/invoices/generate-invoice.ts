import { PDFDocument, rgb } from 'pdf-lib';
import { db } from '../../lib/db';
import { blobs } from '../../lib/blobs';
import type { ApiResponse, GenerateInvoiceResponse, GenerateInvoiceRequest } from '../../../src/types/invoice';

export const config = {
  path: '/api/generate-invoice',
};

export default async (req: Request, context: any) => {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const body: GenerateInvoiceRequest = await req.json();
    const { template_id, invoice_data } = body;

    if (!template_id || !invoice_data) {
      return new Response(JSON.stringify({ success: false, error: 'Template ID and invoice data are required' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Get template and its fields
    const template = await db.getTemplate(template_id);
    if (!template) {
      return new Response(JSON.stringify({ success: false, error: 'Template not found' }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    const fields = await db.getTemplateFields(template_id);
    if (fields.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No fields configured for this template' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Get template PDF from blobs
    const templateBuffer = await blobs.getTemplate(template.blob_key);
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const page = pdfDoc.getPage(0);
    const { width, height } = page.getSize();

    // Embed default font
    const font = await pdfDoc.embedFont('Helvetica');

    // Draw text for each field
    for (const field of fields) {
      const value = invoice_data[field.field_name];
      if (value !== undefined && value !== null && value !== '') {
        // Convert value to string
        const textValue = String(value);
        
        // Calculate position (PDF coordinates start from bottom-left)
        const x = field.x_position;
        const y = height - field.y_position - field.font_size; // Adjust for font size

        // Draw the text
        page.drawText(textValue, {
          x,
          y,
          size: field.font_size,
          font,
          color: rgb(0, 0, 0), // Black text
        });
      }
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Save generated invoice to blobs
    const invoiceBlobKey = `invoice_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const pdfBuffer = new Uint8Array(pdfBytes);
    await blobs.uploadTemplate(invoiceBlobKey, pdfBuffer.buffer);

    // Save invoice record to database
    const invoice = await db.createInvoice(template_id, invoice_data, invoiceBlobKey);

    // For now, return the PDF as base64
    // In production, you might want to return a URL to the generated PDF
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

    const response: GenerateInvoiceResponse = {
      success: true,
      pdf_url: pdfUrl,
      invoice,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    
    const response: GenerateInvoiceResponse = {
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