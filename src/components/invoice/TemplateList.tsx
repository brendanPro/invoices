import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Template, ApiResponse } from '@/types/invoice';

interface TemplateListProps {
  onTemplateSelect?: (template: Template) => void;
  onTemplateDeleted?: () => void;
}

export function TemplateList({ onTemplateSelect, onTemplateDeleted }: TemplateListProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/list-templates');
      const result: ApiResponse<Template[]> = await response.json();

      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        setError(result.error || 'Failed to load templates');
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      setDeletingId(id);
      setError(null);

      const response = await fetch(`/api/delete-template?id=${id}`, {
        method: 'DELETE',
      });
      const result: ApiResponse = await response.json();

      if (result.success) {
        setTemplates(templates.filter(t => t.id !== id));
        onTemplateDeleted?.();
      } else {
        setError(result.error || 'Failed to delete template');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (loading) {
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
      <CardHeader>
        <CardTitle>Templates</CardTitle>
        <Button onClick={fetchTemplates} variant="outline" size="sm">
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {templates.length === 0 ? (
          <p className="text-gray-600">No templates found. Upload a template to get started.</p>
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
                    onClick={() => deleteTemplate(template.id)}
                    disabled={deletingId === template.id}
                  >
                    {deletingId === template.id ? 'Deleting...' : 'Delete'}
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
