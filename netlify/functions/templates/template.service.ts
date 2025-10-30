import { drizzleDb } from '../../lib/drizzle-db';
import { blobs } from '../../lib/blobs';
import type { Template } from '../../../src/types/index';

export class TemplateService {
  /**
   * Get all templates from the database filtered by user email
   */
  async getAllTemplates(userEmail: string): Promise<Template[]> {
    try {
      return await drizzleDb.listTemplates(userEmail);
    } catch (error) {
      console.error('Service: Error fetching templates from database:', error);
      throw new Error('Failed to retrieve templates');
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(name: string, fileData: string, userEmail: string): Promise<Template> {
    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(fileData, 'base64');

      // Generate unique blob key
      const blobKey = this.generateBlobKey();
      console.log('Service: Generated blob key:', blobKey);

      // Upload to Netlify Blobs
      await this.uploadToBlobs(blobKey, buffer);

      // Save template metadata to database
      const template = await this.saveTemplateToDatabase(name, blobKey, userEmail);

      return template;
    } catch (error) {
      console.error('Service: Error creating template:', error);
      throw new Error('Failed to create template');
    }
  }

  /**
   * Delete a template and its associated data
   */
  async deleteTemplate(templateId: number, userEmail: string): Promise<void> {
    try {
      // Get template to find blob key
      const template = await drizzleDb.getTemplateById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Delete from database (cascade will handle template_fields)
      await drizzleDb.deleteTemplate(templateId, userEmail);

      // Delete from Netlify Blobs
      await this.deleteFromBlobs(template.blob_key);
    } catch (error) {
      console.error('Service: Error deleting template:', error);
      throw new Error('Failed to delete template');
    }
  }

  /**
   * Check if a template exists
   */
  async templateExists(templateId: number, userEmail: string): Promise<boolean> {
    try {
      console.log(
        'Service: Checking template existence for template ID:',
        templateId,
        'and user email:',
        userEmail,
      );
      return await drizzleDb.templateExists(templateId, userEmail);
    } catch (error) {
      console.error('Service: Error checking template existence:', error);
      return false;
    }
  }

  /**
   * Get a single template by ID filtered by user email
   */
  async getTemplateById(templateId: number, userEmail: string): Promise<Template | null> {
    try {
      return await drizzleDb.getTemplateById(templateId);
    } catch (error) {
      console.error('Service: Error fetching template by ID:', error);
      throw new Error('Failed to retrieve template');
    }
  }

  /**
   * Generate a unique blob key for template storage
   */
  private generateBlobKey(): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    return `template_${timestamp}_${randomString}.pdf`;
  }

  /**
   * Upload template to Netlify Blobs
   */
  private async uploadToBlobs(blobKey: string, buffer: Buffer): Promise<void> {
    try {
      const arrayBuffer = new Uint8Array(buffer).buffer;
      await blobs.uploadTemplate(blobKey, arrayBuffer);
    } catch (error) {
      console.error('Service: Error uploading to blobs:', error);
      throw new Error('Failed to upload template file');
    }
  }

  /**
   * Save template metadata to database
   */
  private async saveTemplateToDatabase(
    name: string,
    blobKey: string,
    userEmail: string,
  ): Promise<Template> {
    try {
      return await drizzleDb.createTemplate(name, blobKey, userEmail);
    } catch (error) {
      console.error('Service: Error saving template to database:', error);
      throw new Error('Failed to save template metadata');
    }
  }

  /**
   * Delete template from Netlify Blobs
   */
  private async deleteFromBlobs(blobKey: string): Promise<void> {
    try {
      await blobs.deleteTemplate(blobKey);
    } catch (error) {
      console.warn('Service: Failed to delete blob (continuing anyway):', error);
      // Continue even if blob deletion fails - template is already deleted from DB
    }
  }

  /**
   * Validate template name
   */
  validateTemplateName(name: string): boolean {
    return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 255;
  }

  /**
   * Validate file data (basic base64 check)
   */
  validateFileData(fileData: string): boolean {
    if (typeof fileData !== 'string') return false;

    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(fileData) && fileData.length > 0;
  }
}
