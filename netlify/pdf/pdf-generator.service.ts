import { PDFDocument, rgb } from 'pdf-lib';
import type { TemplateField } from '@/types/index';
import type { IPdfGeneratorService } from '@netlify/pdf/IPdfGeneratorService';
import { hexToRgb } from '@netlify/lib/color-utils';

export class PdfGeneratorService implements IPdfGeneratorService {
  async generate(
    templateBlob: ArrayBuffer,
    fields: TemplateField[],
    invoiceData: Record<string, unknown>,
  ): Promise<ArrayBuffer> {
    const pdfDoc = await PDFDocument.load(templateBlob);
    const page = pdfDoc.getPage(0);
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont('Helvetica');

    for (const field of fields) {
      const value = invoiceData[field.field_name];
      if (value === undefined || value === null || value === '') continue;

      const pdfY = height - field.y_position - field.font_size;
      const colorRgb = hexToRgb(field.color ?? '#000000');

      page.drawText(String(value), {
        x: field.x_position,
        y: pdfY,
        size: field.font_size,
        font,
        color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    ) as ArrayBuffer;
  }
}
