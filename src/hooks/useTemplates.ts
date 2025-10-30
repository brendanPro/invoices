import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Template, CreateTemplateRequest } from '@/types/index';
import { API_ENDPOINTS, authenticatedFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UploadTemplateParams {
  name: string;
  file: File;
}

async function fetchTemplates(): Promise<Template[]> {
  const response = await authenticatedFetch(API_ENDPOINTS.TEMPLATES);

  if (!response.ok) {
    throw new Error(`Failed to fetch templates: ${response.statusText}`);
  }

  const result: ApiResponse<Template[]> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to load templates');
  }
}

async function uploadTemplate({ name, file }: UploadTemplateParams): Promise<Template> {
  // Convert file to base64
  const fileData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:application/pdf;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const requestData: CreateTemplateRequest = {
    name,
    fileData,
  };

  const response = await authenticatedFetch(API_ENDPOINTS.TEMPLATES, {
    method: 'POST',
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result: ApiResponse<Template> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Upload failed');
  }
}

async function fetchTemplate(id: number): Promise<Template> {
  const response = await authenticatedFetch(`${API_ENDPOINTS.TEMPLATES}/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }

  const result: ApiResponse<Template> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to load template');
  }
}

async function deleteTemplate(id: number): Promise<void> {
  const response = await authenticatedFetch(`${API_ENDPOINTS.TEMPLATES}?id=${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete template: ${response.statusText}`);
  }

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete template');
  }
}

export function useTemplates() {
  const { user } = useAuth();
  // Use a stable email value to prevent query key changes mid-render
  const userEmail = user?.email ?? null;

  return useQuery({
    queryKey: ['templates', userEmail],
    queryFn: fetchTemplates,
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userEmail, // Only fetch when user is authenticated
  });
}

export function useUploadTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadTemplate,
    onSuccess: () => {
      // Invalidate and refetch templates after successful upload
      // Use a pattern to invalidate all template queries (will match current user's query)
      queryClient.invalidateQueries({
        queryKey: ['templates'],
        exact: false,
      });
    },
    onError: (error) => {
      console.error('Template upload failed:', error);
    },
  });
}

export function useTemplate(templateId: number) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: () => fetchTemplate(templateId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!templateId && templateId > 0,
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      // Invalidate and refetch templates after successful deletion
      // Use a pattern to invalidate all template queries (will match current user's query)
      queryClient.invalidateQueries({
        queryKey: ['templates'],
        exact: false,
      });
    },
    onError: (error) => {
      console.error('Template deletion failed:', error);
    },
  });
}
