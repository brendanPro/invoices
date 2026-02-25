import type { TemplateField } from '@/types/index';

export interface IPdfGeneratorService {
  generate(
    templateBlob: ArrayBuffer,
    fields: TemplateField[],
    invoiceData: Record<string, unknown>,
  ): Promise<ArrayBuffer>;
}
