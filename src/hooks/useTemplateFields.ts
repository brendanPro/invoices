import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TemplateField, CreateTemplateFieldRequest } from '@/types/template-field';
import { API_ENDPOINTS, authenticatedFetch } from '@/lib/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function fetchTemplateFields(templateId: number): Promise<TemplateField[]> {
  const response = await authenticatedFetch(API_ENDPOINTS.FIELDS(templateId));

  if (!response.ok) {
    throw new Error(`Failed to fetch template fields: ${response.statusText}`);
  }

  const result: ApiResponse<TemplateField[]> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to load template fields');
  }
}

async function createTemplateField(
  templateId: number,
  fieldData: CreateTemplateFieldRequest,
): Promise<TemplateField> {
  const response = await authenticatedFetch(API_ENDPOINTS.FIELDS(templateId), {
    method: 'POST',
    body: JSON.stringify(fieldData),
  });

  if (!response.ok) {
    throw new Error(`Failed to create field: ${response.statusText}`);
  }

  const result: ApiResponse<TemplateField> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to create field');
  }
}

async function deleteTemplateField(templateId: number, fieldId: number): Promise<void> {
  const response = await authenticatedFetch(
    `${API_ENDPOINTS.FIELDS(templateId)}/${fieldId}`,
    {
      method: 'DELETE',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to delete field: ${response.statusText}`);
  }

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete field');
  }
}

export function useTemplateFields(templateId: number) {
  return useQuery({
    queryKey: ['template-fields', templateId],
    queryFn: () => fetchTemplateFields(templateId),
    enabled: !!templateId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    // keepPreviousData: false,
  });
}

export function useCreateTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      fieldData,
    }: {
      templateId: number;
      fieldData: CreateTemplateFieldRequest;
    }) => createTemplateField(templateId, fieldData),
    onSuccess: (_, { templateId }) => {
      // Invalidate and refetch template fields after successful creation
      queryClient.invalidateQueries({
        queryKey: ['template-fields', templateId],
        exact: false,
      });
    },
    onError: (error) => {
      console.error('Template field creation failed:', error);
    },
  });
}

export function useDeleteTemplateField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, fieldId }: { templateId: number; fieldId: number }) =>
      deleteTemplateField(templateId, fieldId),
    onSuccess: (_, { templateId }) => {
      // Invalidate and refetch template fields after successful deletion
      queryClient.invalidateQueries({
        queryKey: ['template-fields', templateId],
        exact: false,
      });
    },
    onError: (error) => {
      console.error('Template field deletion failed:', error);
    },
  });
}
