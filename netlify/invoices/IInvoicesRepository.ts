import type { Invoice } from "@/types/index";

export interface IInvoicesRepository {
  create(templateId: number, invoiceData: Record<string, any>): Promise<Invoice>;
  findById(id: number): Promise<Invoice | null>;
  updatePdfBlobKey(id: number, pdfBlobKey: string): Promise<Invoice | null>;
  findAll(userEmail: string): Promise<Invoice[]>;
  delete(id: number): Promise<Invoice | null>;
}