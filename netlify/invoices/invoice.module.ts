import type { ITemplateService } from "@netlify/templates/ITemplateService";
import { InvoiceController } from "@netlify/invoices/invoice.controller";
import { InvoiceService } from "@netlify/invoices/invoice.service";
import { InvoicesRepository } from "@netlify/invoices/invoices.repository";

export class InvoiceModule {
  private repository: InvoicesRepository;
  private _service: InvoiceService;
  private _controller: InvoiceController;

  constructor(templateService: ITemplateService) {
    this.repository = new InvoicesRepository();
    this._service = new InvoiceService(this.repository, templateService);
    this._controller = new InvoiceController(this._service);
  }

  get controller(): InvoiceController {
    return this._controller;
  }

  get service(): InvoiceService {
    return this._service;
  }
}