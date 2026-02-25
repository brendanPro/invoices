import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Clipboard, ChevronDown, ChevronRight, FolderPlus } from 'lucide-react';
import type { TemplateField, FieldBounds, FieldData } from '@/types/template-field';
import type { TemplateFieldGroup } from '@/types/template-group';
import { FieldForm } from './FieldForm';

interface FieldSidebarProps {
  fields: TemplateField[];
  groups: TemplateFieldGroup[];
  onAddFieldClick: () => void;
  onFieldDelete: (fieldId: number) => void;
  onFieldSelect: (field: TemplateField) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: number) => void;
  onAssignFieldToGroup: (fieldId: number, groupId: number | null) => void;
  onGroupSelect: (groupId: number) => void;
  selectedGroupId?: number;
  copiedGroupId?: number;
  newField?: FieldBounds;
  editingField?: FieldBounds;
  selectedField?: TemplateField;
  copiedField?: TemplateField;
  fieldFormInitialValues?: {
    field_name?: string;
    field_type?: 'text' | 'number' | 'date';
    font_size?: number;
    color?: string;
  };
  onFieldSave: (fieldData: FieldData) => void;
  onFieldUpdate?: (fieldData: FieldData) => void;
  onFieldCancel: () => void;
  onEditCancel?: () => void;
  isDrawingMode: boolean;
  onFieldTypeChange?: (fieldType: 'text' | 'number' | 'date') => void;
  pendingFieldType?: 'text' | 'number' | 'date';
  onPreviewChange?: (preview: { field_name?: string; font_size?: number; color?: string }) => void;
}

const GROUP_COLORS = [
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-teal-100 text-teal-800 border-teal-300',
  'bg-pink-100 text-pink-800 border-pink-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
  'bg-yellow-100 text-yellow-800 border-yellow-300',
];

function getGroupColor(index: number): string {
  return GROUP_COLORS[index % GROUP_COLORS.length];
}

function getFieldTypeColor(fieldType: string): string {
  switch (fieldType) {
    case 'text': return 'bg-blue-100 text-blue-800';
    case 'number': return 'bg-green-100 text-green-800';
    case 'date': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

interface FieldCardProps {
  field: TemplateField;
  groups: TemplateFieldGroup[];
  isSelected: boolean;
  isCopied: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onAssignToGroup: (groupId: number | null) => void;
}

function FieldCard({ field, groups, isSelected, isCopied, onSelect, onDelete, onAssignToGroup }: FieldCardProps) {
  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isSelected
          ? 'ring-2 ring-blue-500 border-blue-500'
          : isCopied
            ? 'ring-2 ring-dashed ring-amber-400 border-amber-400'
            : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate text-sm">{field.field_name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="secondary" className={`text-xs ${getFieldTypeColor(field.field_type)}`}>
                {field.field_type}
              </Badge>
              <span className="text-xs text-gray-500">{field.font_size}px</span>
              {field.color && (
                <div
                  className="w-3.5 h-3.5 rounded border border-gray-300 shrink-0"
                  style={{ backgroundColor: field.color }}
                  title={field.color}
                />
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {Math.round(parseFloat(String(field.x_position)))}, {Math.round(parseFloat(String(field.y_position)))} —{' '}
              {Math.round(parseFloat(String(field.width)))}×{Math.round(parseFloat(String(field.height)))}
            </div>
            {groups.length > 0 && (
              <select
                className="mt-1.5 w-full text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                value={field.group_id ?? ''}
                onChange={(e) => {
                  e.stopPropagation();
                  const val = e.target.value;
                  onAssignToGroup(val === '' ? null : parseInt(val));
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">— No group —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0 p-1 h-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface GroupSectionProps {
  group: TemplateFieldGroup;
  groupIndex: number;
  fields: TemplateField[];
  allGroups: TemplateFieldGroup[];
  isSelected: boolean;
  isCopied: boolean;
  selectedField?: TemplateField;
  copiedField?: TemplateField;
  onFieldSelect: (field: TemplateField) => void;
  onFieldDelete: (fieldId: number) => void;
  onDeleteGroup: (groupId: number) => void;
  onAssignFieldToGroup: (fieldId: number, groupId: number | null) => void;
  onGroupSelect: (groupId: number) => void;
}

function GroupSection({
  group,
  groupIndex,
  fields,
  allGroups,
  isSelected,
  isCopied,
  selectedField,
  copiedField,
  onFieldSelect,
  onFieldDelete,
  onDeleteGroup,
  onAssignFieldToGroup,
  onGroupSelect,
}: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const colorClass = getGroupColor(groupIndex);

  return (
    <div className="mb-3">
      <div
        className={`flex items-center justify-between px-2 py-1.5 rounded-md border cursor-pointer select-none ${colorClass} ${
          isSelected ? 'ring-2 ring-amber-400' : isCopied ? 'ring-2 ring-dashed ring-amber-300 opacity-80' : ''
        }`}
        onClick={() => {
          onGroupSelect(group.id);
          setCollapsed((c) => !c);
        }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {collapsed ? <ChevronRight className="w-3.5 h-3.5 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0" />}
          <span className="font-medium text-sm truncate">{group.name}</span>
          <span className="text-xs opacity-70">({fields.length})</span>
          {isCopied && <Clipboard className="w-3 h-3 shrink-0 text-amber-500" aria-label="Copied" />}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteGroup(group.id);
          }}
          className="p-0.5 h-auto opacity-60 hover:opacity-100 hover:bg-red-100 hover:text-red-600"
          title="Delete group"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {!collapsed && (
        <div className="mt-1.5 space-y-1.5 pl-2">
          {fields.length === 0 ? (
            <p className="text-xs text-gray-400 py-1 pl-1">No fields in this group</p>
          ) : (
            fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                groups={allGroups}
                isSelected={selectedField?.id === field.id}
                isCopied={copiedField?.id === field.id}
                onSelect={() => onFieldSelect(field)}
                onDelete={() => onFieldDelete(field.id)}
                onAssignToGroup={(gId) => onAssignFieldToGroup(field.id, gId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function FieldSidebar({
  fields,
  groups,
  onAddFieldClick,
  onFieldDelete,
  onFieldSelect,
  onCreateGroup,
  onDeleteGroup,
  onAssignFieldToGroup,
  onGroupSelect,
  selectedGroupId,
  copiedGroupId,
  newField,
  editingField,
  selectedField,
  copiedField,
  fieldFormInitialValues,
  onFieldSave,
  onFieldUpdate,
  onFieldCancel,
  onEditCancel,
  isDrawingMode,
  onFieldTypeChange,
  pendingFieldType = 'text',
  onPreviewChange,
}: FieldSidebarProps) {
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  const handleCreateGroup = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    onCreateGroup(trimmed);
    setNewGroupName('');
    setShowNewGroupInput(false);
  };

  const ungroupedFields = fields.filter((f) => f.group_id === null || f.group_id === undefined);

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden sticky top-0 self-start">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Template Fields</h2>
        <p className="text-sm text-gray-600 mt-1">
          {isDrawingMode ? 'Click and drag on the PDF to create a field' : 'Add fields to your template'}
        </p>
      </div>

      {/* Action buttons */}
      <div className="p-3 shrink-0 border-b border-gray-200 space-y-2">
        <Button
          onClick={onAddFieldClick}
          disabled={isDrawingMode}
          className="w-full"
          variant={isDrawingMode ? 'outline' : 'default'}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isDrawingMode ? 'Drawing Mode Active' : 'Add Field'}
        </Button>

        {showNewGroupInput ? (
          <div className="flex gap-1.5">
            <Input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup();
                if (e.key === 'Escape') {
                  setShowNewGroupInput(false);
                  setNewGroupName('');
                }
              }}
              placeholder="Group name…"
              className="h-8 text-sm"
            />
            <Button size="sm" className="h-8 shrink-0" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Add
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowNewGroupInput(true)}
            className="w-full"
            variant="outline"
            size="sm"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Group
          </Button>
        )}
      </div>

      {/* New Field Form */}
      {newField && !editingField && (
        <div className="p-4 border-b border-gray-200 bg-white shrink-0 max-h-[60vh] overflow-y-auto">
          <FieldForm
            bounds={newField}
            onSave={onFieldSave}
            onCancel={onFieldCancel}
            onFieldTypeChange={onFieldTypeChange}
            defaultFieldType={pendingFieldType}
            onPreviewChange={onPreviewChange}
          />
        </div>
      )}

      {/* Editing Field Form */}
      {editingField && selectedField && (
        <div className="p-4 border-b border-gray-200 bg-white shrink-0 max-h-[60vh] overflow-y-auto">
          <FieldForm
            bounds={editingField}
            onSave={onFieldUpdate || onFieldSave}
            onCancel={onEditCancel || onFieldCancel}
            onFieldTypeChange={onFieldTypeChange}
            defaultFieldType={selectedField.field_type}
            onPreviewChange={onPreviewChange}
            initialValues={fieldFormInitialValues}
            isEditMode={true}
          />
        </div>
      )}

      {/* Fields list organised by group */}
      <div className="flex-1 overflow-y-auto p-3 min-h-0">
        {fields.length === 0 ? (
          <div className="text-center py-8">
            <Plus className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">No fields yet. Click "Add Field" to get started.</p>
          </div>
        ) : (
          <>
            {/* Groups */}
            {groups.map((group, idx) => (
              <GroupSection
                key={group.id}
                group={group}
                groupIndex={idx}
                fields={fields.filter((f) => f.group_id === group.id)}
                allGroups={groups}
                isSelected={selectedGroupId === group.id}
                isCopied={copiedGroupId === group.id}
                selectedField={selectedField}
                copiedField={copiedField}
                onFieldSelect={onFieldSelect}
                onFieldDelete={onFieldDelete}
                onDeleteGroup={onDeleteGroup}
                onAssignFieldToGroup={onAssignFieldToGroup}
                onGroupSelect={onGroupSelect}
              />
            ))}

            {/* Ungrouped fields */}
            {(ungroupedFields.length > 0 || groups.length === 0) && (
              <div className="mb-2">
                {groups.length > 0 && (
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                    Ungrouped
                  </p>
                )}
                <div className="space-y-1.5">
                  {ungroupedFields.map((field) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      groups={groups}
                      isSelected={selectedField?.id === field.id}
                      isCopied={copiedField?.id === field.id}
                      onSelect={() => onFieldSelect(field)}
                      onDelete={() => onFieldDelete(field.id)}
                      onAssignToGroup={(gId) => onAssignFieldToGroup(field.id, gId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 space-y-1">
        <p className="text-xs text-gray-500">
          {fields.length} field{fields.length !== 1 ? 's' : ''} — {groups.length} group{groups.length !== 1 ? 's' : ''}
        </p>
        {copiedGroupId ? (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Clipboard className="w-3 h-3" />
            <span>
              Group <strong>{groups.find((g) => g.id === copiedGroupId)?.name}</strong> copied — ⌘V to paste
            </span>
          </p>
        ) : copiedField ? (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Clipboard className="w-3 h-3" />
            <span>
              <strong>{copiedField.field_name}</strong> copied — ⌘V to paste
            </span>
          </p>
        ) : (
          <p className="text-xs text-gray-400">Select a field or group then ⌘C to copy</p>
        )}
      </div>
    </div>
  );
}
