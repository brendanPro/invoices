import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from '@tanstack/react-router';
import type { Template } from '@/types/index';
import { useTemplates, useDeleteTemplate } from '@/hooks/useTemplates';

interface TemplateListProps {
  onTemplateSelect?: (template: Template) => void;
  onTemplateDeleted?: () => void;
}

export function TemplateList({ onTemplateSelect, onTemplateDeleted }: TemplateListProps) {
  const { data: templates = [], isLoading, error, refetch } = useTemplates();
  const deleteMutation = useDeleteTemplate();
  const navigate = useNavigate();

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      onTemplateDeleted?.();
    } catch (error) {
      // Error is handled by TanStack Query's error state
      console.error('Delete error:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Templates</CardTitle>
        <div className="flex gap-2">
          <Button onClick={() => navigate({ to: '/templates' })} size="sm">
            Create Template
          </Button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Failed to load templates'}
            </p>
          </div>
        )}

        {deleteMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">
              {deleteMutation.error instanceof Error 
                ? deleteMutation.error.message 
                : 'Failed to delete template'}
            </p>
          </div>
        )}

        {templates.length === 0 ? (
          <p className="text-gray-600">No templates found. Click "Create Template" to get started.</p>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{template.name}</h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(template.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTemplateSelect?.(template)}
                  >
                    Select
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
