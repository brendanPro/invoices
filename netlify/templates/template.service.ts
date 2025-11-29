import { blobs as blobsTemplateService } from '@netlify/lib/blobs';
import type { Template } from '@/types/index';
import type { ITemplatesRepository } from '@netlify/templates/ITemplatesRepository';
import type { ITemplateService } from '@netlify/templates/ITemplateService';
import type { IFieldsService } from '@netlify/fields/IFieldsService';

export class TemplateService implements ITemplateService{
  private readonly repository: ITemplatesRepository;
  private readonly fieldsService: IFieldsService;

  constructor(repository: ITemplatesRepository, fieldsService: IFieldsService){
    this.repository = repository;
    this.fieldsService = fieldsService;
  }
  async getAllTemplates(userEmail: string): Promise<Template[]> {
    try {
      return await this.repository.findAll(userEmail);
    } catch (error) {
      console.error('Service: Error fetching templates from database:', error);
      throw new Error('Failed to retrieve templates');
    }
  }

  async createTemplate(name: string, fileData: string, userEmail: string): Promise<Template> {
    try {
      const buffer = Buffer.from(fileData, 'base64');
      const blobKey = this.generateBlobKey();
      console.log('Service: Generated blob key:', blobKey);
      await this.uploadToBlobs(blobKey, buffer);
      const template = await this.repository.create(name, blobKey, userEmail);
      return template;
    } catch (error) {
      console.error('Service: Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  async deleteTemplate(templateId: number, userEmail: string): Promise<void> {
    try {
      const template = await this.repository.findById(templateId);
      if (!template) throw new Error('Template not found')

      await this.repository.delete(templateId, userEmail);
      await this.deleteFromBlobs(template.blob_key);
    } catch (error) {
      console.error('Service: Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }


  async templateExists(templateId: number, userEmail?: string): Promise<boolean> {
    try {
      console.log(
        `Service: Checking template existence for template ID: 
        ${templateId} 
        ${userEmail ? `and user email: ${userEmail}` : 'no email provided'}
        `,
      );
      return await this.repository.exists(templateId, userEmail);
    } catch (error) {
      console.error('Service: Error checking template existence:', error);
      return false;
    }
  }

  async getTemplateById(templateId: number, userEmail: string): Promise<Template | null> {
    try {
      return await this.repository.findById(templateId);
    } catch (error) {
      console.error('Service: Error fetching template by ID:', error);
      throw new Error('Failed to retrieve template');
    }
  }

  async getTemplateByIdWithFields(templateId: number, userEmail: string): Promise<Template | null> {
    const template = await this.repository.findById(templateId);
    if (!template) throw new Error('Template not found')
    if (template.user_email !== userEmail) throw new Error('Template not found')

    const fields = await this.fieldsService.findFieldsByTemplateId(templateId);
    template.fields = fields;
    return template;
  }

  validateTemplateName(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 255;
  }

  validateFileData(fileData: string): boolean {
    if (typeof fileData !== 'string') return false;

    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(fileData) && fileData.length > 0;
  }

  private generateBlobKey(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    return `template_${timestamp}_${randomString}.pdf`;
  }

  private async uploadToBlobs(blobKey: string, buffer: Buffer): Promise<void> {
    try {
      const arrayBuffer = new Uint8Array(buffer).buffer;
      await blobsTemplateService.uploadTemplate(blobKey, arrayBuffer);
    } catch (error) {
      console.error('Service: Error uploading to blobs:', error);
      throw new Error('Failed to upload template file');
    }
  }

  private async deleteFromBlobs(blobKey: string): Promise<void> {
    try {
      await blobsTemplateService.deleteTemplate(blobKey);
    } catch (error) {
      console.warn('Service: Failed to delete blob (continuing anyway):', error);
      // Continue even if blob deletion fails - template is already deleted from DB
    }
  }
}
