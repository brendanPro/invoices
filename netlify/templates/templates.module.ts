import { TemplatesRepository } from '@netlify/templates/templates.repository';
import { TemplateService } from '@netlify/templates/template.service';
import { TemplateController } from '@netlify/templates/template.controller';
import type { IFieldsService } from '@netlify/fields/IFieldsService';

export class TemplateModule {
  private readonly repository: TemplatesRepository;
  readonly service: TemplateService;
  readonly controller: TemplateController;

  constructor(fieldsService: IFieldsService) {
    this.repository = new TemplatesRepository();
    this.service = new TemplateService(this.repository, fieldsService);
    this.controller = new TemplateController(this.service);
  }
}
