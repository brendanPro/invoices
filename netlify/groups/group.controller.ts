import { HttpHandler } from '@netlify/lib/http-handler';
import { AppError, NotFoundError, ValidationError } from '@netlify/lib/errors';
import type { IGroupService } from '@netlify/groups/IGroupService';
import type { ITemplateService } from '@netlify/templates/ITemplateService';

export class GroupController {
  private readonly groupService: IGroupService;
  private readonly templateService: ITemplateService;

  constructor(groupService: IGroupService, templateService: ITemplateService) {
    this.groupService = groupService;
    this.templateService = templateService;
  }

  async getGroups(templateId: number): Promise<Response> {
    return HttpHandler.handleAsync(
      () => this.groupService.getGroupsByTemplateId(templateId),
      'Failed to retrieve groups',
    );
  }

  async createGroup(req: Request, templateId: number, userEmail: string): Promise<Response> {
    try {
      await this.validateTemplateAccess(templateId, userEmail);

      const body = await req.json();
      const { name } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return HttpHandler.badRequest('Group name is required');
      }

      return HttpHandler.handleAsync(
        () => this.groupService.createGroup({ template_id: templateId, name: name.trim() }),
        'Failed to create group',
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Create group error:', error);
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  async updateGroup(req: Request, templateId: number, groupId: number, userEmail: string): Promise<Response> {
    try {
      await this.validateTemplateAccess(templateId, userEmail);

      const body = await req.json();
      const { name } = body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return HttpHandler.badRequest('Group name is required');
      }

      return HttpHandler.handleAsync(
        () => this.groupService.updateGroup(templateId, groupId, { name: name.trim() }),
        'Failed to update group',
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Update group error:', error);
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  async deleteGroup(templateId: number, groupId: number, userEmail: string): Promise<Response> {
    try {
      await this.validateTemplateAccess(templateId, userEmail);
      return HttpHandler.handleAsync(
        () => this.groupService.deleteGroup(templateId, groupId),
        'Failed to delete group',
        { status: 204 },
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Delete group error:', error);
      return HttpHandler.internalError('Failed to delete group');
    }
  }

  async moveGroup(req: Request, templateId: number, groupId: number, userEmail: string): Promise<Response> {
    try {
      await this.validateTemplateAccess(templateId, userEmail);

      const body = await req.json();
      const { dx, dy } = body;

      if (typeof dx !== 'number' || typeof dy !== 'number') {
        return HttpHandler.badRequest('dx and dy must be numbers');
      }

      return HttpHandler.handleAsync(
        () => this.groupService.moveGroup(templateId, groupId, dx, dy),
        'Failed to move group',
      );
    } catch (error) {
      if (error instanceof AppError) return HttpHandler.fromAppError(error);
      console.error('Move group error:', error);
      return HttpHandler.badRequest('Invalid request body');
    }
  }

  private async validateTemplateAccess(templateId: number, userEmail: string): Promise<void> {
    const exists = await this.templateService.templateExists(templateId, userEmail);
    if (!exists) throw new NotFoundError('Template not found or access denied');
  }
}
