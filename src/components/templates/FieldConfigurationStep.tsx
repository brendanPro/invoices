import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FieldSidebar } from './FieldSidebar';
import { InteractivePdfViewer } from './InteractivePdfViewer';
import {
  useTemplateFields,
  useCreateTemplateField,
  useDeleteTemplateField,
} from '@/hooks/useTemplateFields';
import type { Template } from '@/types/index';
import type { TemplateField, FieldBounds, FieldData } from '@/types/template-field';
import { useSearch } from '@tanstack/react-router';

interface FieldConfigurationStepProps {
  template: Template;
  onComplete: () => void;
  onBack: () => void;
}

export function FieldConfigurationStep({
  template,
  onComplete,
  onBack,
}: FieldConfigurationStepProps) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [newFieldBounds, setNewFieldBounds] = useState<FieldBounds | null>(null);
  const [selectedField, setSelectedField] = useState<TemplateField | null>(null);
  const [pendingFieldType, setPendingFieldType] = useState<'text' | 'number' | 'date'>('text');

  const { templateId: searchTemplateId } = useSearch({ from: '/templates' });
  const templateId = useMemo(() => {
    const propId = Number(template?.id) || 0;
    const routeId = Number(searchTemplateId) || 0;
    return propId || routeId;
  }, [template?.id, searchTemplateId]);

  // React Query hooks
  const { data: fields = [], isLoading, error } = useTemplateFields(templateId);
  const createFieldMutation = useCreateTemplateField();
  const deleteFieldMutation = useDeleteTemplateField();

  const handleAddFieldClick = () => {
    setIsDrawingMode(true);
    setNewFieldBounds(null);
    setPendingFieldType('text'); // Reset to default
  };

  const handleFieldCreate = useCallback((bounds: FieldBounds) => {
    setNewFieldBounds({ ...bounds, field_type: pendingFieldType });
    setIsDrawingMode(false);
  }, [pendingFieldType]);

  const handleDrawingComplete = () => {
    setIsDrawingMode(false);
  };

  const handleFieldSave = async (fieldData: FieldData) => {
    try {
      await createFieldMutation.mutateAsync({
        templateId,
        fieldData: {
          template_id: templateId,
          field_name: fieldData.field_name,
          x_position: fieldData.x_position,
          y_position: fieldData.y_position,
          width: fieldData.width,
          height: fieldData.height,
          font_size: fieldData.font_size,
          field_type: fieldData.field_type,
          color: fieldData.color || '#000000',
        },
      });
      setNewFieldBounds(null);
      setPendingFieldType('text'); // Reset to default
    } catch (error) {
      console.error('Failed to save field:', error);
    }
  };

  const handleFieldCancel = () => {
    setNewFieldBounds(null);
    setPendingFieldType('text'); // Reset to default
  };

  const handleFieldTypeChange = useCallback((fieldType: 'text' | 'number' | 'date') => {
    setPendingFieldType(fieldType);
    // Update the pending field bounds with the new field type
    setNewFieldBounds((prev) => {
      if (prev) {
        return { ...prev, field_type: fieldType };
      }
      return prev;
    });
  }, []);

  const handlePreviewChange = useCallback((preview: { field_name?: string; font_size?: number; color?: string }) => {
    // Update the pending field bounds with preview data
    setNewFieldBounds((prev) => {
      if (prev) {
        return { ...prev, ...preview };
      }
      return prev;
    });
  }, []);

  const handleFieldDelete = async (fieldId: number) => {
    if (!confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      await deleteFieldMutation.mutateAsync({
        templateId,
        fieldId,
      });
    } catch (error) {
      console.error('Failed to delete field:', error);
    }
  };

  const handleFieldSelect = (field: TemplateField) => {
    setSelectedField(field);
  };

  if (!templateId) {
    return (
      <div className="flex h-full items-center justify-center w-full">
        <p className="text-gray-600">No template selected.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading fields...</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full">
        <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-600 mb-4">Failed to load fields</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-600 mb-4">Failed to load PDF</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <FieldSidebar
        fields={fields}
        onAddFieldClick={handleAddFieldClick}
        onFieldDelete={handleFieldDelete}
        onFieldSelect={handleFieldSelect}
        newField={newFieldBounds || undefined}
        onFieldSave={handleFieldSave}
        onFieldCancel={handleFieldCancel}
        isDrawingMode={isDrawingMode}
        onFieldTypeChange={handleFieldTypeChange}
        pendingFieldType={pendingFieldType}
        onPreviewChange={handlePreviewChange}
      />

      {/* Right - PDF Viewer */}
      <InteractivePdfViewer
        key={templateId}
        templateId={templateId}
        fields={fields}
        isDrawingMode={isDrawingMode}
        pendingField={newFieldBounds || undefined}
        onFieldCreate={handleFieldCreate}
        onDrawingComplete={handleDrawingComplete}
        onPendingFieldUpdate={(bounds) => {
          setNewFieldBounds(bounds);
        }}
      />

      {/* Action Buttons - Fixed at bottom right */}
      <div className="absolute bottom-6 right-6 flex gap-3">
        <Button onClick={onBack} variant="outline">
          Back to Upload
        </Button>
        <Button
          onClick={onComplete}
          disabled={fields.length === 0}
          title={fields.length === 0 ? 'Add at least one field to continue' : ''}
        >
          Review & Save
        </Button>
      </div>
    </div>
  );
}
