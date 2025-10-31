import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTemplateFields } from '@/hooks/useTemplateFields';
import type { Template } from '@/types/index';
import { useSearch } from '@tanstack/react-router';

interface ReviewStepProps {
  template: Template;
  onBack: () => void;
  onComplete: () => void;
}

export function ReviewStep({ template, onBack, onComplete }: ReviewStepProps) {
  const { templateId: searchTemplateId } = useSearch({ from: '/templates' });
  const templateId = useMemo(() => {
    const propId = Number(template?.id) || 0;
    const routeId = Number(searchTemplateId) || 0;
    return propId || routeId;
  }, [template?.id, searchTemplateId]);

  const { data: fields = [], isLoading, error } = useTemplateFields(templateId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading template details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4">Failed to load template details</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Template Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
          <CardDescription>Overview of your template configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Template Name</p>
              <p className="text-lg font-semibold text-gray-900">{template.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Template ID</p>
              <p className="text-lg font-semibold text-gray-900">#{template.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Created At</p>
              <p className="text-base text-gray-700">{formatDate(template.created_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Updated</p>
              <p className="text-base text-gray-700">{formatDate(template.updated_at)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Fields</p>
              <p className="text-base text-gray-700">
                {fields.length} field{fields.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fields Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Fields</CardTitle>
          <CardDescription>
            {fields.length > 0
              ? `${fields.length} field${fields.length !== 1 ? 's' : ''} configured for this template`
              : 'No fields configured yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No fields have been configured for this template.</p>
              <Button onClick={onBack} variant="outline" className="mt-4">
                Go Back to Configure Fields
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">{field.field_name}</h3>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            field.field_type === 'text'
                              ? 'bg-blue-100 text-blue-800'
                              : field.field_type === 'number'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {field.field_type}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div>
                          <p className="text-xs text-gray-500">Position</p>
                          <p className="text-sm font-medium text-gray-900">
                            ({parseFloat(field.x_position).toFixed(2)},{' '}
                            {parseFloat(field.y_position).toFixed(2)})
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Size</p>
                          <p className="text-sm font-medium text-gray-900">
                            {parseFloat(field.width).toFixed(2)} ×{' '}
                            {parseFloat(field.height).toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Font Size</p>
                          <p className="text-sm font-medium text-gray-900">
                            {parseFloat(field.font_size).toFixed(1)}pt
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Field ID</p>
                          <p className="text-sm font-medium text-gray-900">#{field.id}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button onClick={onBack} variant="outline">
          Back to Field Configuration
        </Button>
        <Button onClick={onComplete} className="px-8">
          Complete & Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
