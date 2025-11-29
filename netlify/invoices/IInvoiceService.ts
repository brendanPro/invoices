import type { Invoice } from "@/types/index";

export interface InvoiceWithTemplate {
  invoice: Invoice;
  pdfBlob: ArrayBuffer;
}

export interface IInvoiceService {
  createInvoice(templateId: number, invoiceData: Record<string, any>): Promise<Invoice>;
  getAllInvoices(userEmail: string): Promise<Invoice[]>;
  deleteInvoice(invoiceId: number, userEmail: string): Promise<void>;
  getInvoiceWithTemplate(invoiceId: number, userEmail: string): Promise<InvoiceWithTemplate>;
  validateTemplateId(templateId: number): boolean;
  validateInvoiceData(invoiceData: Record<string, any>): boolean;
}