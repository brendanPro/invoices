import { GroupRepository } from '@netlify/groups/group.repository';
import { GroupService } from '@netlify/groups/group.service';
import { GroupController } from '@netlify/groups/group.controller';
import type { ITemplateService } from '@netlify/templates/ITemplateService';

export class GroupModule {
  private readonly repository: GroupRepository;
  readonly service: GroupService;
  readonly controller: GroupController;

  constructor(templateService: ITemplateService) {
    this.repository = new GroupRepository();
    this.service = new GroupService(this.repository);
    this.controller = new GroupController(this.service, templateService);
  }
}
