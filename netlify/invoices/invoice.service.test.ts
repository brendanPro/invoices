import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Invoice, TemplateField } from '@/types/index';
import { InvoiceService } from '@netlify/invoices/invoice.service';
import type { IInvoicesRepository } from '@netlify/invoices/IInvoicesRepository';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import type { Template } from '@/types/index';

// Mock pdf-lib
const mockPDFDocument = {
  load: mock((buffer: ArrayBuffer) => Promise.resolve({
    getPage: mock(() => ({
      getSize: mock(() => ({ width: 612, height: 792 })),
      drawText: mock(() => { }),
    })),
    embedFont: mock(() => Promise.resolve({})),
    save: mock(() => Promise.resolve({
      buffer: new ArrayBuffer(0),
      byteOffset: 0,
      byteLength: 1,
    })),
  })),
};

mock.module('pdf-lib', () => ({
  PDFDocument: mockPDFDocument,
  rgb: mock(() => ({})),
}));

const mockBlobsService = {
  getTemplate: mock<(key: string) => Promise<ArrayBuffer>>(() => Promise.resolve(new ArrayBuffer(0))),
  uploadTemplate: mock<(key: string, buffer: ArrayBuffer) => Promise<void>>(() => Promise.resolve()),
  deleteTemplate: mock<(key: string) => Promise<void>>(() => Promise.resolve()),
};

mock.module('@netlify/lib/blobs', () => ({
  blobs: mockBlobsService,
}));

const mockInvoicesRepository = {
  create: mock<(templateId: number, invoiceData: Record<string, any>) => Promise<Invoice>>(() => Promise.resolve({} as Invoice)),
  findById: mock<(id: number) => Promise<Invoice | null>>(() => Promise.resolve(null)),
  findAll: mock<(userEmail: string) => Promise<Invoice[]>>(() => Promise.resolve([])),
  updatePdfBlobKey: mock<(id: number, pdfBlobKey: string) => Promise<Invoice | null>>(() => Promise.resolve(null)),
  delete: mock<(id: number) => Promise<Invoice | null>>(() => Promise.resolve(null)),
} as IInvoicesRepository;

const mockTemplateService: ITemplateService = {
  templateExists: mock<(templateId: number, userEmail?: string) => Promise<boolean>>(() => Promise.resolve(false)),
  getTemplateById: mock<(templateId: number, userEmail: string) => Promise<Template | null>>(() => Promise.resolve(null)),
  getTemplateByIdWithFields: mock<(templateId: number, userEmail: string) => Promise<Template | null>>(() => Promise.resolve(null)),
  getAllTemplates: mock<(userEmail: string) => Promise<Template[]>>(() => Promise.resolve([])),
  createTemplate: mock<(name: string, fileData: string, userEmail: string) => Promise<Template>>(() => Promise.resolve({} as Template)),
  deleteTemplate: mock<(templateId: number, userEmail: string) => Promise<void>>(() => Promise.resolve()),
};

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;

  beforeEach(() => {
    for (const key in mockInvoicesRepository) {
      (mockInvoicesRepository as any)[key].mockClear();
    }
    for (const key in mockTemplateService) {
      (mockTemplateService as any)[key].mockClear();
    }
    for (const key in mockBlobsService) {
      (mockBlobsService as any)[key].mockClear();
    }

    invoiceService = new InvoiceService(mockInvoicesRepository, mockTemplateService);
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const templateId = 1;
      const invoiceData = { customer_name: 'John Doe', amount: 100 };
      const mockInvoice: Invoice = {
        id: 1,
        template_id: templateId,
        invoice_data: invoiceData,
        generated_at: '2024-01-01T00:00:00.000Z',
      };

      mockTemplateService.templateExists.mockResolvedValue(true);
      mockInvoicesRepository.create.mockResolvedValue(mockInvoice);

      const result = await invoiceService.createInvoice(templateId, invoiceData);

      expect(result).toEqual(mockInvoice);
      expect(mockTemplateService.templateExists).toHaveBeenCalledTimes(1);
      expect(mockTemplateService.templateExists).toHaveBeenCalledWith(templateId);
      expect(mockInvoicesRepository.create).toHaveBeenCalledTimes(1);
      expect(mockInvoicesRepository.create).toHaveBeenCalledWith(templateId, invoiceData);
    });

    it('should throw error when template does not exist', async () => {
      const templateId = 999;
      const invoiceData = { customer_name: 'John Doe', amount: 100 };

      mockTemplateService.templateExists.mockResolvedValue(false);

      await expect(invoiceService.createInvoice(templateId, invoiceData)).rejects.toThrow(
        'Template not found'
      );
      expect(mockTemplateService.templateExists).toHaveBeenCalledWith(templateId);
      expect(mockInvoicesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when repository create fails', async () => {
      const templateId = 1;
      const invoiceData = { customer_name: 'John Doe', amount: 100 };
      const repositoryError = new Error('Database insert failed');

      mockTemplateService.templateExists.mockResolvedValue(true);
      mockInvoicesRepository.create.mockRejectedValue(repositoryError);

      await expect(invoiceService.createInvoice(templateId, invoiceData)).rejects.toThrow(
        'Failed to create invoice'
      );
      expect(mockTemplateService.templateExists).toHaveBeenCalledWith(templateId);
      expect(mockInvoicesRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllInvoices', () => {
    it('should return all invoices for a user', async () => {
      const userEmail = 'test@example.com';
      const mockInvoices: Invoice[] = [
        {
          id: 1,
          template_id: 1,
          invoice_data: { customer_name: 'John Doe', amount: 100 },
          generated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          template_id: 1,
          invoice_data: { customer_name: 'Jane Doe', amount: 200 },
          generated_at: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockInvoicesRepository.findAll.mockResolvedValue(mockInvoices);

      const result = await invoiceService.getAllInvoices(userEmail);

      expect(result).toEqual(mockInvoices);
      expect(mockInvoicesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockInvoicesRepository.findAll).toHaveBeenCalledWith(userEmail);
    });

    it('should throw error when repository throws an error', async () => {
      const userEmail = 'test@example.com';
      const repositoryError = new Error('Database connection failed');

      mockInvoicesRepository.findAll.mockRejectedValue(repositoryError);

      await expect(invoiceService.getAllInvoices(userEmail)).rejects.toThrow(
        'Failed to retrieve invoices'
      );
      expect(mockInvoicesRepository.findAll).toHaveBeenCalledWith(userEmail);
    });
  });

  describe('deleteInvoice', () => {
    it('should delete an invoice successfully', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
        pdf_blob_key: 'invoice_1_1234567890_abc123.pdf',
      };
      const mockTemplate: Template = {
        id: 1,
        name: 'Test Template',
        blob_key: 'template_123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);
      mockBlobsService.deleteTemplate.mockResolvedValue(undefined);
      mockInvoicesRepository.delete.mockResolvedValue(mockInvoice);

      await invoiceService.deleteInvoice(invoiceId, userEmail);

      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
      expect(mockBlobsService.deleteTemplate).toHaveBeenCalledWith(mockInvoice.pdf_blob_key);
      expect(mockInvoicesRepository.delete).toHaveBeenCalledWith(invoiceId);
    });

    it('should throw error when invoice is not found', async () => {
      const invoiceId = 999;
      const userEmail = 'test@example.com';

      mockInvoicesRepository.findById.mockResolvedValue(null);

      await expect(invoiceService.deleteInvoice(invoiceId, userEmail)).rejects.toThrow(
        'Invoice not found'
      );
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateById).not.toHaveBeenCalled();
      expect(mockInvoicesRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when template is not found', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
      };

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateById.mockResolvedValue(null);

      await expect(invoiceService.deleteInvoice(invoiceId, userEmail)).rejects.toThrow(
        'Template not found'
      );
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
      expect(mockInvoicesRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error when template user email does not match', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
      };
      const mockTemplate: Template = {
        id: 1,
        name: 'Test Template',
        blob_key: 'template_123.pdf',
        user_email: 'other@example.com', // Different user
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);

      await expect(invoiceService.deleteInvoice(invoiceId, userEmail)).rejects.toThrow(
        'Invoice not found'
      );
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
      expect(mockInvoicesRepository.delete).not.toHaveBeenCalled();
    });

    it('should continue deletion even if blob deletion fails', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
        pdf_blob_key: 'invoice_1_1234567890_abc123.pdf',
      };
      const mockTemplate: Template = {
        id: 1,
        name: 'Test Template',
        blob_key: 'template_123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      const blobError = new Error('Blob not found');

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateById.mockResolvedValue(mockTemplate);
      mockBlobsService.deleteTemplate.mockRejectedValue(blobError);
      mockInvoicesRepository.delete.mockResolvedValue(mockInvoice);

      // Should not throw - blob deletion failure is handled gracefully
      await invoiceService.deleteInvoice(invoiceId, userEmail);

      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateById).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
      expect(mockBlobsService.deleteTemplate).toHaveBeenCalledWith(mockInvoice.pdf_blob_key);
      expect(mockInvoicesRepository.delete).toHaveBeenCalledWith(invoiceId);
    });
  });

  describe('getInvoiceWithTemplate', () => {
    it('should return invoice with template and existing PDF blob', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
        pdf_blob_key: 'invoice_1_1234567890_abc123.pdf',
      };
      const mockTemplate: Template = {
        id: 1,
        name: 'Test Template',
        blob_key: 'template_123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        fields: [],
      };
      const mockPdfBlob = new ArrayBuffer(100);

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateByIdWithFields.mockResolvedValue(mockTemplate);
      mockBlobsService.getTemplate.mockResolvedValue(mockPdfBlob);

      const result = await invoiceService.getInvoiceWithTemplate(invoiceId, userEmail);

      expect(result.invoice).toEqual({ ...mockInvoice, pdf_blob_key: mockInvoice.pdf_blob_key });
      expect(result.pdfBlob).toBe(mockPdfBlob);
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateByIdWithFields).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
      expect(mockBlobsService.getTemplate).toHaveBeenCalledWith(mockInvoice.pdf_blob_key);
    });

    it('should generate new PDF when blob does not exist', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
        // No pdf_blob_key - should trigger generation
      };
      const mockFields: TemplateField[] = [
        {
          id: 1,
          template_id: 1,
          field_name: 'customer_name',
          x_position: '10',
          y_position: '20',
          width: '100',
          height: '30',
          font_size: '12',
          field_type: 'text',
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ];
      const mockTemplate: Template = {
        id: 1,
        name: 'Test Template',
        blob_key: 'template_123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        fields: mockFields,
      };
      const templateBlob = new ArrayBuffer(100);
      let generatedBlobKey: string | undefined;

      // Set up mocks for this test - ensure they're applied
      (mockInvoicesRepository.findById as any).mockImplementation(() => Promise.resolve(mockInvoice));
      (mockTemplateService.getTemplateByIdWithFields as any).mockImplementation(() => Promise.resolve(mockTemplate));
      mockBlobsService.getTemplate.mockImplementation((key: string) => {
        if (key === mockTemplate.blob_key) {
          return Promise.resolve(templateBlob);
        }
        return Promise.reject(new Error('Blob not found'));
      });
      mockBlobsService.uploadTemplate.mockImplementation((key: string) => {
        generatedBlobKey = key;
        return Promise.resolve();
      });
      mockInvoicesRepository.updatePdfBlobKey.mockResolvedValue({ ...mockInvoice, pdf_blob_key: generatedBlobKey });

      const result = await invoiceService.getInvoiceWithTemplate(invoiceId, userEmail);

      expect(result.invoice.pdf_blob_key).toBeTruthy();
      expect(result.invoice.pdf_blob_key).toMatch(/^invoice_\d+_\d+_[a-z0-9]+\.pdf$/);
      expect(result.pdfBlob).toBeTruthy();
      expect(mockBlobsService.getTemplate).toHaveBeenCalledWith(mockTemplate.blob_key);
      expect(mockBlobsService.uploadTemplate).toHaveBeenCalledTimes(1);
      expect(mockInvoicesRepository.updatePdfBlobKey).toHaveBeenCalledTimes(1);
    });

    it('should throw error when invoice is not found', async () => {
      const invoiceId = 999;
      const userEmail = 'test@example.com';

      mockInvoicesRepository.findById.mockResolvedValue(null);

      await expect(invoiceService.getInvoiceWithTemplate(invoiceId, userEmail)).rejects.toThrow(
        'Invoice not found'
      );
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateByIdWithFields).not.toHaveBeenCalled();
    });

    it('should throw error when template is not found', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
      };

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateByIdWithFields.mockResolvedValue(null);

      await expect(invoiceService.getInvoiceWithTemplate(invoiceId, userEmail)).rejects.toThrow(
        'Template not found'
      );
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateByIdWithFields).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
    });

    it('should throw error when template user email does not match', async () => {
      const invoiceId = 1;
      const userEmail = 'test@example.com';
      const mockInvoice: Invoice = {
        id: invoiceId,
        template_id: 1,
        invoice_data: { customer_name: 'John Doe', amount: 100 },
        generated_at: '2024-01-01T00:00:00.000Z',
      };
      const mockTemplate: Template = {
        id: 1,
        name: 'Test Template',
        blob_key: 'template_123.pdf',
        user_email: 'other@example.com', // Different user
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        fields: [],
      };

      mockInvoicesRepository.findById.mockResolvedValue(mockInvoice);
      mockTemplateService.getTemplateByIdWithFields.mockResolvedValue(mockTemplate);

      await expect(invoiceService.getInvoiceWithTemplate(invoiceId, userEmail)).rejects.toThrow(
        'Invoice not found'
      );
      expect(mockInvoicesRepository.findById).toHaveBeenCalledWith(invoiceId);
      expect(mockTemplateService.getTemplateByIdWithFields).toHaveBeenCalledWith(mockInvoice.template_id, userEmail);
    });
  });

  describe('validateTemplateId', () => {
    it('should return true for valid positive integer', () => {
      const validIds = [1, 100, 999, Number.MAX_SAFE_INTEGER];

      validIds.forEach(id => {
        expect(invoiceService.validateTemplateId(id)).toBe(true);
      });
    });

    it('should return false for zero', () => {
      expect(invoiceService.validateTemplateId(0)).toBe(false);
    });

    it('should return false for negative numbers', () => {
      expect(invoiceService.validateTemplateId(-1)).toBe(false);
      expect(invoiceService.validateTemplateId(-100)).toBe(false);
    });

    it('should return false for non-integers', () => {
      expect(invoiceService.validateTemplateId(1.5)).toBe(false);
      expect(invoiceService.validateTemplateId(10.99)).toBe(false);
    });

    it('should return false for non-number values', () => {
      expect(invoiceService.validateTemplateId(null as any)).toBe(false);
      expect(invoiceService.validateTemplateId(undefined as any)).toBe(false);
      expect(invoiceService.validateTemplateId('1' as any)).toBe(false);
      expect(invoiceService.validateTemplateId({} as any)).toBe(false);
    });
  });

  describe('validateInvoiceData', () => {
    it('should return true for valid invoice data object', () => {
      const validData = [
        { customer_name: 'John Doe', amount: 100 },
        { field1: 'value1', field2: 'value2' },
        {},
      ];

      validData.forEach(data => {
        expect(invoiceService.validateInvoiceData(data)).toBe(true);
      });
    });

    it('should return false for null', () => {
      expect(invoiceService.validateInvoiceData(null as any)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(invoiceService.validateInvoiceData([])).toBe(false);
      expect(invoiceService.validateInvoiceData([1, 2, 3])).toBe(false);
    });

    it('should return false for non-object values', () => {
      expect(invoiceService.validateInvoiceData('string' as any)).toBe(false);
      expect(invoiceService.validateInvoiceData(123 as any)).toBe(false);
      expect(invoiceService.validateInvoiceData(undefined as any)).toBe(false);
    });
  });
});

