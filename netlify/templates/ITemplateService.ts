import type { Template } from "@/types/index";

export interface ITemplateService {
  templateExists(templateId: number): Promise<boolean>;
  getTemplateById(templateId: number, userEmail: string): Promise<Template | null>;
  getTemplateByIdWithFields(templateId: number, userEmail: string): Promise<Template | null>;
  getAllTemplates(userEmail: string): Promise<Template[]>;
  createTemplate(name: string, fileData: string, userEmail: string): Promise<Template>;
  deleteTemplate(templateId: number, userEmail: string): Promise<void>;
}