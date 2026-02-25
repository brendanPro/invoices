import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  TemplateFieldGroup,
  CreateGroupRequest,
  UpdateGroupRequest,
  MoveGroupRequest,
} from '@/types/template-group';
import { API_ENDPOINTS, authenticatedFetch } from '@/lib/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchGroups(templateId: number): Promise<TemplateFieldGroup[]> {
  const response = await authenticatedFetch(API_ENDPOINTS.GROUPS(templateId));
  if (!response.ok) throw new Error(`Failed to fetch groups: ${response.statusText}`);
  const result: ApiResponse<TemplateFieldGroup[]> = await response.json();
  if (result.success && result.data) return result.data;
  throw new Error(result.error || 'Failed to load groups');
}

async function createGroup(templateId: number, data: CreateGroupRequest): Promise<TemplateFieldGroup> {
  const response = await authenticatedFetch(API_ENDPOINTS.GROUPS(templateId), {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to create group: ${response.statusText}`);
  const result: ApiResponse<TemplateFieldGroup> = await response.json();
  if (result.success && result.data) return result.data;
  throw new Error(result.error || 'Failed to create group');
}

async function updateGroup(
  templateId: number,
  groupId: number,
  data: UpdateGroupRequest,
): Promise<TemplateFieldGroup> {
  const response = await authenticatedFetch(`${API_ENDPOINTS.GROUPS(templateId)}/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update group: ${response.statusText}`);
  const result: ApiResponse<TemplateFieldGroup> = await response.json();
  if (result.success && result.data) return result.data;
  throw new Error(result.error || 'Failed to update group');
}

async function deleteGroup(templateId: number, groupId: number): Promise<void> {
  const response = await authenticatedFetch(`${API_ENDPOINTS.GROUPS(templateId)}/${groupId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error(`Failed to delete group: ${response.statusText}`);
}

async function moveGroup(
  templateId: number,
  groupId: number,
  data: MoveGroupRequest,
): Promise<void> {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.GROUPS(templateId)}/${groupId}/move`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) throw new Error(`Failed to move group: ${response.statusText}`);
}

export function useTemplateGroups(templateId: number) {
  return useQuery({
    queryKey: ['template-groups', templateId],
    queryFn: () => fetchGroups(templateId),
    enabled: !!templateId,
    refetchOnWindowFocus: false,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: number; data: CreateGroupRequest }) =>
      createGroup(templateId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-groups', templateId] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      groupId,
      data,
    }: {
      templateId: number;
      groupId: number;
      data: UpdateGroupRequest;
    }) => updateGroup(templateId, groupId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-groups', templateId] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, groupId }: { templateId: number; groupId: number }) =>
      deleteGroup(templateId, groupId),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-groups', templateId] });
      queryClient.invalidateQueries({ queryKey: ['template-fields', templateId] });
    },
  });
}

export function useMoveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId,
      groupId,
      data,
    }: {
      templateId: number;
      groupId: number;
      data: MoveGroupRequest;
    }) => moveGroup(templateId, groupId, data),
    onSuccess: (_, { templateId }) => {
      queryClient.invalidateQueries({ queryKey: ['template-fields', templateId] });
    },
  });
}
