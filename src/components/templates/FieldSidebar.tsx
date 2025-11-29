import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus } from 'lucide-react';
import type { TemplateField, FieldBounds, FieldData } from '@/types/template-field';
import { FieldForm } from './FieldForm';

interface FieldSidebarProps {
  fields: TemplateField[];
  onAddFieldClick: () => void;
  onFieldDelete: (fieldId: number) => void;
  onFieldSelect: (field: TemplateField) => void;
  newField?: FieldBounds; // Field being created
  onFieldSave: (fieldData: FieldData) => void;
  onFieldCancel: () => void;
  isDrawingMode: boolean;
}

export function FieldSidebar({ 
  fields, 
  onAddFieldClick, 
  onFieldDelete, 
  onFieldSelect,
  newField,
  onFieldSave,
  onFieldCancel,
  isDrawingMode
}: FieldSidebarProps) {
  const getFieldTypeColor = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return 'bg-blue-100 text-blue-800';
      case 'number': return 'bg-green-100 text-green-800';
      case 'date': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Template Fields</h2>
        <p className="text-sm text-gray-600 mt-1">
          {isDrawingMode ? 'Click and drag on the PDF to create a field' : 'Add fields to your template'}
        </p>
      </div>

      {/* Add Field Button */}
      <div className="p-4">
        <Button
          onClick={onAddFieldClick}
          disabled={isDrawingMode}
          className="w-full"
          variant={isDrawingMode ? "outline" : "default"}
        >
          <Plus className="w-4 h-4 mr-2" />
          {isDrawingMode ? 'Drawing Mode Active' : 'Add Field'}
        </Button>
      </div>

      {/* New Field Form */}
      {newField && (
        <div className="p-4 border-b border-gray-200">
          <FieldForm
            bounds={newField}
            onSave={onFieldSave}
            onCancel={onFieldCancel}
          />
        </div>
      )}

      {/* Fields List */}
      <div className="flex-1 overflow-y-auto p-4">
        {fields.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Plus className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500">
              No fields yet. Click "Add Field" to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field) => (
              <Card 
                key={field.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onFieldSelect(field)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {field.field_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant="secondary" 
                          className={getFieldTypeColor(field.field_type)}
                        >
                          {field.field_type}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {field.font_size}px
                        </span>
                        {field.color && (
                          <div className="flex items-center gap-1">
                            <div
                              className="w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: field.color }}
                              title={`Color: ${field.color}`}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Position: {Math.round(parseFloat(field.x_position))}, {Math.round(parseFloat(field.y_position))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Size: {Math.round(parseFloat(field.width))} × {Math.round(parseFloat(field.height))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldDelete(field.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          {fields.length} field{fields.length !== 1 ? 's' : ''} configured
        </p>
      </div>
    </div>
  );
}
