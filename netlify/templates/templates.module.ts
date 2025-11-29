import { TemplatesRepository } from '@netlify/templates/templates.repository';
import { TemplateService } from '@netlify/templates/template.service';
import { TemplateController } from '@netlify/templates/template.controller';
import type { IFieldsService } from '@netlify/fields/IFieldsService';

export class TemplateModule {
    private repository: TemplatesRepository;
    private _service: TemplateService;
    private _controller: TemplateController;

    constructor(fieldsService: IFieldsService) {
        this.repository = new TemplatesRepository();
        this._service = new TemplateService(this.repository, fieldsService);
        this._controller = new TemplateController(this.service);
    }

    get controller(): TemplateController {
        return this._controller;
    }

    get service(): TemplateService {
        return this._service;
    }
}