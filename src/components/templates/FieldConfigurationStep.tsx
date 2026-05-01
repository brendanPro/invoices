import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FieldSidebar } from './FieldSidebar';
import { InteractivePdfViewer } from './InteractivePdfViewer';
import {
  useTemplateFields,
  useCreateTemplateField,
  useUpdateTemplateField,
  useDeleteTemplateField,
} from '@/hooks/useTemplateFields';
import {
  useTemplateGroups,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useMoveGroup,
} from '@/hooks/useTemplateGroups';
import type { Template } from '@/types/index';
import type { TemplateField, FieldBounds, FieldData } from '@/types/template-field';
import type { TemplateFieldGroup } from '@/types/template-group';
import { useSearch } from '@tanstack/react-router';

const PASTE_OFFSET_PX = 20;

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
  const [copiedField, setCopiedField] = useState<TemplateField | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [copiedGroup, setCopiedGroup] = useState<{ group: TemplateFieldGroup; fields: TemplateField[] } | null>(null);

  const { templateId: searchTemplateId } = useSearch({ from: '/templates' });
  const templateId = useMemo(() => {
    const propId = Number(template?.id) || 0;
    const routeId = Number(searchTemplateId) || 0;
    return propId || routeId;
  }, [template?.id, searchTemplateId]);

  // React Query hooks — fields
  const { data: fields = [], isLoading, error, refetch: refetchFields } = useTemplateFields(templateId);
  const createFieldMutation = useCreateTemplateField();
  const updateFieldMutation = useUpdateTemplateField();
  const deleteFieldMutation = useDeleteTemplateField();

  // React Query hooks — groups
  const { data: groups = [] } = useTemplateGroups(templateId);
  const createGroupMutation = useCreateGroup();
  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const moveGroupMutation = useMoveGroup();

  const handleAddFieldClick = () => {
    setIsDrawingMode(true);
    setNewFieldBounds(null);
    setSelectedField(null); // Clear any selected field when creating new
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
    // Don't clear selectedField here - that's handled by onEditCancel
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

  // Store preview state separately to avoid updating selectedField during preview
  const [previewState, setPreviewState] = useState<{ field_name?: string; font_size?: number; color?: string } | null>(null);
  
  const handlePreviewChange = useCallback((preview: { field_name?: string; font_size?: number; color?: string }) => {
    // Update the pending field bounds with preview data
    setNewFieldBounds((prev) => {
      if (prev) {
        return { ...prev, ...preview };
      }
      return prev;
    });
    
    // Store preview state separately (for selected field preview)
    setPreviewState(preview);
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
    // Clear new field creation when selecting an existing field for editing
    setNewFieldBounds(null);
    setIsDrawingMode(false);
  };

  const handleFieldUpdate = async (fieldData: FieldData) => {
    if (!selectedField) return;
    
    try {
      await updateFieldMutation.mutateAsync({
        templateId,
        fieldId: selectedField.id,
        fieldData: {
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
      
      // Wait for fields to refetch before clearing selection
      // The mutation's onSuccess already triggers refetch, so wait a bit for it to complete
      await refetchFields();
      
      // Clear selection after fields have been refetched
      setSelectedField(null);
    } catch (error) {
      console.error('Failed to update field:', error);
    }
  };

  const handleEditCancel = () => {
    setSelectedField(null);
  };

  const handleCreateGroup = async (name: string) => {
    try {
      await createGroupMutation.mutateAsync({ templateId, data: { name } });
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Delete this group? Fields will become ungrouped.')) return;
    try {
      await deleteGroupMutation.mutateAsync({ templateId, groupId });
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const handleRenameGroup = useCallback(
    async (groupId: number, name: string) => {
      await updateGroupMutation.mutateAsync({ templateId, groupId, data: { name } });
    },
    [updateGroupMutation, templateId],
  );

  const handleAssignFieldToGroup = async (fieldId: number, groupId: number | null) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    try {
      await updateFieldMutation.mutateAsync({
        templateId,
        fieldId,
        fieldData: {
          field_name: field.field_name,
          field_type: field.field_type,
          font_size: parseFloat(String(field.font_size)),
          x_position: parseFloat(String(field.x_position)),
          y_position: parseFloat(String(field.y_position)),
          width: parseFloat(String(field.width)),
          height: parseFloat(String(field.height)),
          color: field.color || '#000000',
          group_id: groupId,
        },
      });
    } catch (err) {
      console.error('Failed to assign field to group:', err);
    }
  };

  const handleMoveGroup = useCallback(
    async (groupId: number, dx: number, dy: number) => {
      try {
        await moveGroupMutation.mutateAsync({ templateId, groupId, data: { dx, dy } });
      } catch (err) {
        console.error('Failed to move group:', err);
      }
    },
    [moveGroupMutation, templateId],
  );

  const handleGroupSelect = useCallback((groupId: number) => {
    setSelectedGroupId(groupId);
    setSelectedField(null);
  }, []);

  const handlePasteGroup = useCallback(async () => {
    if (!copiedGroup) return;

    const existingGroupNames = new Set(groups.map((g) => g.name));
    const baseName = copiedGroup.group.name.replace(/ \(copy(?: \d+)?\)$/, '');
    let candidateName = `${baseName} (copy)`;
    if (existingGroupNames.has(candidateName)) {
      let idx = 2;
      while (existingGroupNames.has(`${baseName} (copy ${idx})`)) idx++;
      candidateName = `${baseName} (copy ${idx})`;
    }

    try {
      const newGroup = await createGroupMutation.mutateAsync({ templateId, data: { name: candidateName } });

      const existingFieldNames = new Set(fields.map((f) => f.field_name));
      for (const field of copiedGroup.fields) {
        const fieldBase = field.field_name.replace(/ \(copy(?: \d+)?\)$/, '');
        let fieldName = `${fieldBase} (copy)`;
        if (existingFieldNames.has(fieldName)) {
          let idx = 2;
          while (existingFieldNames.has(`${fieldBase} (copy ${idx})`)) idx++;
          fieldName = `${fieldBase} (copy ${idx})`;
        }
        existingFieldNames.add(fieldName);

        await createFieldMutation.mutateAsync({
          templateId,
          fieldData: {
            template_id: templateId,
            group_id: newGroup.id,
            field_name: fieldName,
            x_position: parseFloat(String(field.x_position)) + PASTE_OFFSET_PX,
            y_position: parseFloat(String(field.y_position)) + PASTE_OFFSET_PX,
            width: parseFloat(String(field.width)),
            height: parseFloat(String(field.height)),
            font_size: parseFloat(String(field.font_size)),
            field_type: field.field_type,
            color: field.color || '#000000',
          },
        });
      }
    } catch (err) {
      console.error('Failed to paste group:', err);
    }
  }, [copiedGroup, groups, fields, createGroupMutation, createFieldMutation, templateId]);

  // Memoize initial values for the form (based on selectedField values)
  // This prevents the form from resetting when preview state changes
  // The values only change when we select a different field, not during preview updates
  const fieldFormInitialValues = useMemo(() => {
    if (!selectedField) return undefined;
    return {
      field_name: selectedField.field_name,
      field_type: selectedField.field_type,
      font_size: parseFloat(selectedField.font_size),
      color: selectedField.color || '#000000',
    };
  }, [
    selectedField?.id, // Field ID
    selectedField?.field_name, // Field name from database
    selectedField?.field_type, // Field type from database
    selectedField?.font_size, // Font size from database
    selectedField?.color, // Color from database
  ]); // Only recalculate when actual field data changes (not preview)

  // Convert selected field to FieldBounds for editing, merging with preview state
  const editingFieldBounds: FieldBounds | null = useMemo(() => {
    if (!selectedField) return null;
    
    return {
      x: parseFloat(selectedField.x_position),
      y: parseFloat(selectedField.y_position),
      width: parseFloat(selectedField.width),
      height: parseFloat(selectedField.height),
      field_type: selectedField.field_type,
      field_name: previewState?.field_name !== undefined ? previewState.field_name : selectedField.field_name,
      font_size: previewState?.font_size !== undefined ? previewState.font_size : parseFloat(selectedField.font_size),
      color: previewState?.color !== undefined ? previewState.color : (selectedField.color || '#000000'),
    };
  }, [selectedField, previewState]);
  
  // Clear preview state when field selection changes
  useEffect(() => {
    setPreviewState(null);
  }, [selectedField?.id]);

  const buildCopiedFieldName = useCallback(
    (originalName: string, existingFields: TemplateField[]): string => {
      const baseName = originalName.replace(/ \(copy(?: \d+)?\)$/, '');
      const existingNames = new Set(existingFields.map((f) => f.field_name));

      const candidate = `${baseName} (copy)`;
      if (!existingNames.has(candidate)) return candidate;

      let index = 2;
      while (existingNames.has(`${baseName} (copy ${index})`)) {
        index++;
      }
      return `${baseName} (copy ${index})`;
    },
    [],
  );

  const handlePaste = useCallback(async () => {
    if (!copiedField) return;

    const fieldName = buildCopiedFieldName(copiedField.field_name, fields);

    try {
      await createFieldMutation.mutateAsync({
        templateId,
        fieldData: {
          template_id: templateId,
          field_name: fieldName,
          x_position: parseFloat(copiedField.x_position) + PASTE_OFFSET_PX,
          y_position: parseFloat(copiedField.y_position) + PASTE_OFFSET_PX,
          width: parseFloat(copiedField.width),
          height: parseFloat(copiedField.height),
          font_size: parseFloat(copiedField.font_size),
          field_type: copiedField.field_type,
          color: copiedField.color || '#000000',
        },
      });
    } catch (error) {
      console.error('Failed to paste field:', error);
    }
  }, [copiedField, fields, buildCopiedFieldName, createFieldMutation, templateId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isEditableTarget =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isEditableTarget) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'c') {
        e.preventDefault();
        if (selectedGroupId) {
          const group = groups.find((g) => g.id === selectedGroupId);
          if (group) {
            const groupFields = fields.filter((f) => f.group_id === selectedGroupId);
            setCopiedGroup({ group, fields: groupFields });
            setCopiedField(null);
          }
        } else if (selectedField) {
          setCopiedField(selectedField);
          setCopiedGroup(null);
        }
      }

      if (isMod && e.key === 'v') {
        e.preventDefault();
        if (copiedGroup) {
          handlePasteGroup();
        } else {
          handlePaste();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedField, selectedGroupId, groups, fields, copiedGroup, handlePaste, handlePasteGroup]);

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
    <div className="flex h-full relative">
      {/* Left Sidebar */}
      <FieldSidebar
        fields={fields}
        groups={groups}
        onAddFieldClick={handleAddFieldClick}
        onFieldDelete={handleFieldDelete}
        onFieldSelect={handleFieldSelect}
        onCreateGroup={handleCreateGroup}
        onRenameGroup={handleRenameGroup}
        onDeleteGroup={handleDeleteGroup}
        onAssignFieldToGroup={handleAssignFieldToGroup}
        onGroupSelect={handleGroupSelect}
        selectedGroupId={selectedGroupId || undefined}
        copiedGroupId={copiedGroup?.group.id}
        newField={newFieldBounds || undefined}
        editingField={editingFieldBounds || undefined}
        selectedField={selectedField || undefined}
        copiedField={copiedField || undefined}
        fieldFormInitialValues={fieldFormInitialValues}
        onFieldSave={handleFieldSave}
        onFieldUpdate={handleFieldUpdate}
        onFieldCancel={handleFieldCancel}
        onEditCancel={handleEditCancel}
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
        groups={groups}
        isDrawingMode={isDrawingMode}
        pendingField={newFieldBounds || undefined}
        selectedFieldId={selectedField?.id}
        selectedField={selectedField || undefined}
        selectedGroupId={selectedGroupId || undefined}
        onFieldCreate={handleFieldCreate}
        onDrawingComplete={handleDrawingComplete}
        onPendingFieldUpdate={(bounds) => {
          setNewFieldBounds(bounds);
        }}
        onSelectedFieldUpdate={(bounds) => {
          if (selectedField) {
            setSelectedField({
              ...selectedField,
              x_position: bounds.x.toString(),
              y_position: bounds.y.toString(),
              width: bounds.width.toString(),
              height: bounds.height.toString(),
            });
          }
        }}
        onGroupMove={handleMoveGroup}
        onGroupSelect={handleGroupSelect}
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
