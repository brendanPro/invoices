import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Template } from '@/types/index';
import { TemplateService } from '@netlify/templates/template.service';

const mockBlobsService = {
  uploadTemplate: mock<(blobKey: string, arrayBuffer: ArrayBuffer) => Promise<void>>((blobKey: string, arrayBuffer: ArrayBuffer) => Promise.resolve()),
  deleteTemplate: mock(() => Promise.resolve()),
  getTemplate: mock(() => Promise.resolve(new ArrayBuffer(0))),
  listTemplates: mock(() => Promise.resolve([])),
};

mock.module('../../lib/blobs', () => ({
  blobs: {
    uploadTemplate: mockBlobsService.uploadTemplate,
    deleteTemplate: mockBlobsService.deleteTemplate,
    getTemplate: mockBlobsService.getTemplate,
    listTemplates: mockBlobsService.listTemplates,
  },
}));

const mockTemplatesRepository = {
  findAll: mock<() => Promise<Template[]>>(() => Promise.resolve([])),
  findById: mock<() => Promise<Template | null>>(() => Promise.resolve(null)),
  create: mock<(name: string, blobKey: string, userEmail: string) => Promise<Template>>(() => Promise.resolve({} as Template)),
  delete: mock<(id: number, userEmail: string) => Promise<Template | null>>(() => Promise.resolve(null)),
  exists: mock<(id: number, userEmail?: string) => Promise<boolean>>(() => Promise.resolve(false)),
};

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    for (const key in mockTemplatesRepository) {
      (mockTemplatesRepository as any)[key].mockClear();
    }
    for (const key in mockBlobsService) {
      (mockBlobsService as any)[key].mockClear();
    }

    templateService = new TemplateService(mockTemplatesRepository);
  });

  describe('getAllTemplates', () => {
    it('should return all templates for a user', async () => {
      const userEmail = 'test@example.com';
      const mockTemplates: Template[] = [
        {
          id: 1,
          name: 'Template 1',
          blob_key: 'blob_key_1',
          user_email: userEmail,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 2,
          name: 'Template 2',
          blob_key: 'blob_key_2',
          user_email: userEmail,
          created_at: '2024-01-02T00:00:00.000Z',
          updated_at: '2024-01-02T00:00:00.000Z',
        },
      ];

      mockTemplatesRepository.findAll.mockResolvedValue(mockTemplates);

      const result = await templateService.getAllTemplates(userEmail);

      expect(result).toEqual(mockTemplates);
      expect(mockTemplatesRepository.findAll).toHaveBeenCalledTimes(1);
      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(userEmail);
    });

    it('should throw error when repository throws an error', async () => {
      const userEmail = 'test@example.com';
      const repositoryError = new Error('Database connection failed');
      mockTemplatesRepository.findAll.mockRejectedValue(repositoryError);

      await expect(templateService.getAllTemplates(userEmail)).rejects.toThrow(
        'Failed to retrieve templates'
      );
      expect(mockTemplatesRepository.findAll).toHaveBeenCalledWith(userEmail);
    });
  });

  describe('createTemplate', () => {
    it('should create a template successfully with matching blobKey', async () => {
      const name = 'Test Template';
      const fileData = 'dGVzdCBwZGYgZGF0YQ==';
      const userEmail = 'test@example.com';
      let generatedBlobKey: string = '';
      
      mockBlobsService.uploadTemplate.mockImplementation((blobKey: string, arrayBuffer: ArrayBuffer) => {
        generatedBlobKey = blobKey;
        return Promise.resolve();
      });
      
      mockTemplatesRepository.create.mockImplementation((name: string, blobKey: string, userEmail: string) => {
        const mockTemplate: Template = {
          id: 1,
          name,
          blob_key: blobKey,
          user_email: userEmail,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        };
        return Promise.resolve(mockTemplate);
      });

      const result = await templateService.createTemplate(name, fileData, userEmail);

      // Verify blobKey was generated and matches the pattern
      expect(generatedBlobKey).toBeTruthy();
      expect(generatedBlobKey).toMatch(/^template_\d+_[a-z0-9]+\.pdf$/);
      
      // Verify uploadTemplate was called with the generated blobKey
      expect(mockBlobsService.uploadTemplate).toHaveBeenCalledTimes(1);
      expect(mockBlobsService.uploadTemplate).toHaveBeenCalledWith(
        generatedBlobKey,
        expect.any(ArrayBuffer)
      );
      
      // Verify repository.create was called with the generated blobKey
      expect(mockTemplatesRepository.create).toHaveBeenCalledTimes(1);
      expect(mockTemplatesRepository.create).toHaveBeenCalledWith(
        name,
        generatedBlobKey,
        userEmail
      );
      
      // Verify the returned template has the same blobKey
      expect(result.blob_key).toBe(generatedBlobKey);
      expect(result.name).toBe(name);
      expect(result.user_email).toBe(userEmail);
    });

    it('should throw error when blob upload fails', async () => {
      const name = 'Test Template';
      const fileData = 'dGVzdCBwZGYgZGF0YQ==';
      const userEmail = 'test@example.com';
      const uploadError = new Error('Blob upload failed');
      mockBlobsService.uploadTemplate.mockRejectedValue(uploadError);

      await expect(templateService.createTemplate(name, fileData, userEmail)).rejects.toThrow(
        'Failed to create template'
      );
      expect(mockBlobsService.uploadTemplate).toHaveBeenCalledTimes(1);
      expect(mockTemplatesRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when repository create fails', async () => {
      const name = 'Test Template';
      const fileData = 'dGVzdCBwZGYgZGF0YQ==';
      const userEmail = 'test@example.com';
      const repositoryError = new Error('Database insert failed');
      mockBlobsService.uploadTemplate.mockResolvedValue(undefined);
      mockTemplatesRepository.create.mockRejectedValue(repositoryError);

      await expect(templateService.createTemplate(name, fileData, userEmail)).rejects.toThrow(
        'Failed to create template'
      );
      expect(mockBlobsService.uploadTemplate).toHaveBeenCalledTimes(1);
      expect(mockTemplatesRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template successfully', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      const mockTemplate: Template = {
        id: templateId,
        name: 'Test Template',
        blob_key: 'template_1234567890_abc123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };

      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);
      mockTemplatesRepository.delete.mockResolvedValue(mockTemplate);
      mockBlobsService.deleteTemplate.mockResolvedValue(undefined);

      await templateService.deleteTemplate(templateId, userEmail);

      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
      expect(mockTemplatesRepository.delete).toHaveBeenCalledWith(templateId, userEmail);
      expect(mockBlobsService.deleteTemplate).toHaveBeenCalledWith(mockTemplate.blob_key);
    });

    it('should throw error when template is not found', async () => {
      const templateId = 999;
      const userEmail = 'test@example.com';
      mockTemplatesRepository.findById.mockResolvedValue(null);

      await expect(templateService.deleteTemplate(templateId, userEmail)).rejects.toThrow(
        'Failed to delete template'
      );
      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
      expect(mockTemplatesRepository.delete).not.toHaveBeenCalled();
      expect(mockBlobsService.deleteTemplate).not.toHaveBeenCalled();
    });

    it('should throw error when repository delete fails', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      const mockTemplate: Template = {
        id: templateId,
        name: 'Test Template',
        blob_key: 'template_1234567890_abc123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      const repositoryError = new Error('Database delete failed');
      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);
      mockTemplatesRepository.delete.mockRejectedValue(repositoryError);

      await expect(templateService.deleteTemplate(templateId, userEmail)).rejects.toThrow(
        'Failed to delete template'
      );
      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
      expect(mockTemplatesRepository.delete).toHaveBeenCalledWith(templateId, userEmail);
      expect(mockBlobsService.deleteTemplate).not.toHaveBeenCalled();
    });

    it('should continue deletion even if blob deletion fails', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      const mockTemplate: Template = {
        id: templateId,
        name: 'Test Template',
        blob_key: 'template_1234567890_abc123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      const blobError = new Error('Blob not found');
      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);
      mockTemplatesRepository.delete.mockResolvedValue(mockTemplate);
      mockBlobsService.deleteTemplate.mockRejectedValue(blobError);

      // Should not throw - blob deletion failure is handled gracefully
      await templateService.deleteTemplate(templateId, userEmail);

      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
      expect(mockTemplatesRepository.delete).toHaveBeenCalledWith(templateId, userEmail);
      expect(mockBlobsService.deleteTemplate).toHaveBeenCalledWith(mockTemplate.blob_key);
    });
  });

  describe('templateExists', () => {
    it('should call the repository.exists method', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      mockTemplatesRepository.exists.mockResolvedValue(true);

      const result = await templateService.templateExists(templateId, userEmail);

      expect(result).toBe(true);
      expect(mockTemplatesRepository.exists).toHaveBeenCalledWith(templateId, userEmail);
    });

    it('should return false when repository throws an error', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      const repositoryError = new Error('Database query failed');
      mockTemplatesRepository.exists.mockRejectedValue(repositoryError);

      const result = await templateService.templateExists(templateId, userEmail);

      expect(result).toBe(false);
      expect(mockTemplatesRepository.exists).toHaveBeenCalledWith(templateId, userEmail);
    });
  });

  describe('getTemplateById', () => {
    it('should return a template when found', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      const mockTemplate: Template = {
        id: templateId,
        name: 'Test Template',
        blob_key: 'template_1234567890_abc123.pdf',
        user_email: userEmail,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      };
      mockTemplatesRepository.findById.mockResolvedValue(mockTemplate);

      const result = await templateService.getTemplateById(templateId, userEmail);

      expect(result).toEqual(mockTemplate);
      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
    });

    it('should return null when template is not found', async () => {
      const templateId = 999;
      const userEmail = 'test@example.com';
      mockTemplatesRepository.findById.mockResolvedValue(null);

      const result = await templateService.getTemplateById(templateId, userEmail);

      expect(result).toBeNull();
      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
    });

    it('should throw error when repository throws an error', async () => {
      const templateId = 1;
      const userEmail = 'test@example.com';
      const repositoryError = new Error('Database query failed');
      mockTemplatesRepository.findById.mockRejectedValue(repositoryError);

      await expect(templateService.getTemplateById(templateId, userEmail)).rejects.toThrow(
        'Failed to retrieve template'
      );
      expect(mockTemplatesRepository.findById).toHaveBeenCalledWith(templateId);
    });
  });

  describe('validateTemplateName', () => {
    it('should return true for valid template name', () => {
      const validNames = ['My Template', 'Template 1', 'a', 'A'.repeat(255)];

      validNames.forEach(name => {
        expect(templateService.validateTemplateName(name)).toBe(true);
      });
    });

    it('should return false for empty string', () => {
      expect(templateService.validateTemplateName('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(templateService.validateTemplateName('   ')).toBe(false);
      expect(templateService.validateTemplateName('\t\n')).toBe(false);
    });

    it('should return false for name longer than 255 characters', () => {
      const longName = 'A'.repeat(256);
      expect(templateService.validateTemplateName(longName)).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(templateService.validateTemplateName(null as any)).toBe(false);
      expect(templateService.validateTemplateName(undefined as any)).toBe(false);
      expect(templateService.validateTemplateName(123 as any)).toBe(false);
      expect(templateService.validateTemplateName({} as any)).toBe(false);
    });

    it('should trim whitespace and validate', () => {
      expect(templateService.validateTemplateName('  Valid Name  ')).toBe(true);
      expect(templateService.validateTemplateName('  ')).toBe(false);
    });
  });

  describe('validateFileData', () => {
    it('should return true for valid base64 string', () => {
      const validBase64Strings = [
        'SGVsbG8gV29ybGQ=',
        'dGVzdCBkYXRh',
        'YWJjZGVmZ2hpams=',
        'SGVsbG8=',
      ];

      validBase64Strings.forEach(data => {
        expect(templateService.validateFileData(data)).toBe(true);
      });
    });

    it('should return false for empty string', () => {
      expect(templateService.validateFileData('')).toBe(false);
    });

    it('should return false for invalid base64 characters', () => {
      const invalidBase64Strings = [
        'Hello World!',
        'test@data#',
        'abc def',
        'invalid-base64@',
      ];

      invalidBase64Strings.forEach(data => {
        expect(templateService.validateFileData(data)).toBe(false);
      });
    });

    it('should return false for non-string values', () => {
      expect(templateService.validateFileData(null as any)).toBe(false);
      expect(templateService.validateFileData(undefined as any)).toBe(false);
      expect(templateService.validateFileData(123 as any)).toBe(false);
      expect(templateService.validateFileData({} as any)).toBe(false);
      expect(templateService.validateFileData([] as any)).toBe(false);
    });

    it('should accept base64 strings with padding', () => {
      expect(templateService.validateFileData('SGVsbG8=')).toBe(true);
      expect(templateService.validateFileData('dGVzdA==')).toBe(true);
      expect(templateService.validateFileData('YWJj')).toBe(true);
    });

    it('should accept base64 strings without padding', () => {
      expect(templateService.validateFileData('SGVsbG8')).toBe(true);
      expect(templateService.validateFileData('dGVzdCBkYXRh')).toBe(true);
    });
  });
});
