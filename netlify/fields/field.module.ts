import { FieldsRepository } from "@netlify/fields/fields.repository";
import { FieldService } from "@netlify/fields/field.service";
import { FieldController } from "@netlify/fields/field.controller";
import type { ITemplateService } from "@netlify/templates/ITemplateService";

export class FieldModule {
  private repository: FieldsRepository;
  private _service: FieldService;
  private _controller: FieldController;

  constructor(templateService: ITemplateService) {
    this.repository = new FieldsRepository();
    this._service = new FieldService(this.repository);
    this._controller = new FieldController(this._service, templateService);
  }

  get service(): FieldService {
    return this._service;
  }

  get controller(): FieldController {
    return this._controller;
  }
}