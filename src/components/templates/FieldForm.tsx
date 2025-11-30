import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FieldBounds, FieldData } from '@/types/template-field';

const fieldSchema = z.object({
  field_name: z.string().min(1, 'Field name is required'),
  field_type: z.enum(['text', 'number', 'date']),
  font_size: z.number().min(8).max(72),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #000000)').default('#000000'),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface FieldFormProps {
  bounds: FieldBounds;
  onSave: (fieldData: FieldData) => void;
  onCancel: () => void;
  onFieldTypeChange?: (fieldType: 'text' | 'number' | 'date') => void;
  defaultFieldType?: 'text' | 'number' | 'date';
  onPreviewChange?: (preview: { field_name?: string; font_size?: number; color?: string }) => void;
  initialValues?: {
    field_name?: string;
    field_type?: 'text' | 'number' | 'date';
    font_size?: number;
    color?: string;
  };
  isEditMode?: boolean;
}

export function FieldForm({ bounds, onSave, onCancel, onFieldTypeChange, defaultFieldType = 'text', onPreviewChange, initialValues, isEditMode = false }: FieldFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
    reset,
  } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      field_name: initialValues?.field_name || '',
      field_type: initialValues?.field_type || defaultFieldType,
      font_size: initialValues?.font_size || 12,
      color: initialValues?.color || '#000000',
    },
  });

  // Track previous initial values to only reset when they actually change (not just reference)
  const previousInitialValuesRef = useRef<string | undefined>(undefined);
  
  // Update form when initialValues change (for edit mode)
  // Only reset when initial values actually change (different field or different values)
  useEffect(() => {
    if (initialValues && isEditMode) {
      // Create a stable key from the values
      const currentKey = JSON.stringify({
        name: initialValues.field_name,
        type: initialValues.field_type,
        fontSize: initialValues.font_size,
        color: initialValues.color,
      });
      
      // Only reset if the values actually changed (different field or different values)
      if (currentKey !== previousInitialValuesRef.current) {
        previousInitialValuesRef.current = currentKey;
        reset({
          field_name: initialValues.field_name || '',
          field_type: initialValues.field_type || defaultFieldType,
          font_size: initialValues.font_size || 12,
          color: initialValues.color || '#000000',
        });
      }
    } else if (!initialValues) {
      // Clear previous values when not in edit mode
      previousInitialValuesRef.current = undefined;
    }
  }, [initialValues, defaultFieldType, reset, isEditMode]);

  const fieldType = watch('field_type');
  const colorValue = watch('color') || '#000000';
  const fieldName = watch('field_name');
  const fontSize = watch('font_size');

  // Store the latest callback in a ref to avoid dependency issues
  const onPreviewChangeRef = useRef(onPreviewChange);
  useEffect(() => {
    onPreviewChangeRef.current = onPreviewChange;
  }, [onPreviewChange]);

  // Notify parent of preview changes
  useEffect(() => {
    if (onPreviewChangeRef.current) {
      onPreviewChangeRef.current({
        field_name: fieldName || undefined,
        font_size: fontSize,
        color: colorValue || '#000000',
      });
    }
  }, [fieldName, fontSize, colorValue]);

  // Handle field type change and notify parent
  const handleFieldTypeChange = (value: string) => {
    const newFieldType = value as 'text' | 'number' | 'date';
    setValue('field_type', newFieldType);
    if (onFieldTypeChange) {
      onFieldTypeChange(newFieldType);
    }
  };

  const handleColorChange = (value: string) => {
    // Normalize hex color (remove # if needed, ensure 6 characters)
    const normalized = value.replace('#', '').toUpperCase();
    if (normalized.length === 6 && /^[0-9A-F]{6}$/.test(normalized)) {
      const hexColor = `#${normalized}`;
      setValue('color', hexColor, { shouldValidate: true });
    } else if (normalized.length <= 6) {
      // Allow partial input while typing
      setValue('color', value.startsWith('#') ? value : `#${value}`, { shouldValidate: false });
    }
  };

  const onSubmit = async (data: FieldFormData) => {
    try {
      setIsSubmitting(true);
      
      // Get color from watched value (always up-to-date)
      // colorValue comes from watch('color') which tracks the form state
      // The watched value is always the most current, so use it directly
      const currentColor = colorValue || '#000000';
      
      const fieldData: FieldData = {
        field_name: data.field_name,
        field_type: data.field_type,
        font_size: data.font_size,
        x_position: bounds.x,
        y_position: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: currentColor, // Use the current color value
      };

      onSave(fieldData);
    } catch (error) {
      console.error('Field save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit Field' : 'Configure Field'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Field Name */}
          <div className="space-y-2">
            <Label htmlFor="field_name">Field Name</Label>
            <Input
              id="field_name"
              {...register('field_name')}
              placeholder="Enter field name"
            />
            {errors.field_name && (
              <p className="text-sm text-red-500">{errors.field_name.message}</p>
            )}
          </div>

          {/* Field Type */}
          <div className="space-y-2">
            <Label htmlFor="field_type">Field Type</Label>
            <Select
              value={fieldType}
              onValueChange={handleFieldTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
            {errors.field_type && (
              <p className="text-sm text-red-500">{errors.field_type.message}</p>
            )}
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <Label htmlFor="font_size">Font Size</Label>
            <Input
              id="font_size"
              type="number"
              min="8"
              max="72"
              {...register('font_size', { valueAsNumber: true })}
              placeholder="12"
            />
            {errors.font_size && (
              <p className="text-sm text-red-500">{errors.font_size.message}</p>
            )}
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <Label htmlFor="color">Text Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={colorValue}
                onChange={(e) => handleColorChange(e.target.value)}
                className="h-10 w-20 cursor-pointer"
              />
              <Input
                type="text"
                value={colorValue}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#000000"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="flex-1 font-mono text-sm"
                maxLength={7}
              />
            </div>
            {errors.color && (
              <p className="text-sm text-red-500">{errors.color.message}</p>
            )}
          </div>

          {/* Position Info (Read-only) */}
          <div className="space-y-2">
            <Label>Position & Size</Label>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>X: {Math.round(bounds.x)}px</div>
              <div>Y: {Math.round(bounds.y)}px</div>
              <div>W: {Math.round(bounds.width)}px</div>
              <div>H: {Math.round(bounds.height)}px</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update Field' : 'Save Field'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
