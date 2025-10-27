import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Template, TemplateField, ApiResponse, CreateTemplateFieldRequest } from '@/types/index';
import { API_ENDPOINTS } from '@/lib/api';

const fieldSchema = z.object({
  field_name: z.string().min(1, 'Field name is required'),
  x_position: z.number().min(0, 'X position must be positive'),
  y_position: z.number().min(0, 'Y position must be positive'),
  font_size: z.number().min(8).max(72).default(12),
  field_type: z.enum(['text', 'number', 'date']).default('text'),
});

type FieldFormData = z.infer<typeof fieldSchema>;

interface ConfigurationFormProps {
  template: Template | null;
  onConfigurationSaved?: () => void;
}

export function ConfigurationForm({ template, onConfigurationSaved }: ConfigurationFormProps) {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FieldFormData>({
    resolver: zodResolver(fieldSchema),
    defaultValues: {
      font_size: 12,
      field_type: 'text',
    },
  });

  const fieldType = watch('field_type');

  const fetchFields = async () => {
    if (!template) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.GET_CONFIGURATION + `?template_id=${template.id}`);
      const result: ApiResponse<TemplateField[]> = await response.json();

      if (result.success && result.data) {
        setFields(result.data);
      } else {
        setError(result.error || 'Failed to load configuration');
      }
    } catch (err) {
      console.error('Error fetching fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FieldFormData) => {
    if (!template) return;

    try {
      setSaving(true);
      setError(null);

      const requestData: CreateTemplateFieldRequest = {
        template_id: template.id,
        field_name: data.field_name,
        x_position: data.x_position,
        y_position: data.y_position,
        font_size: data.font_size,
        field_type: data.field_type,
      };

      const response = await fetch(API_ENDPOINTS.SAVE_CONFIGURATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result: ApiResponse<TemplateField> = await response.json();

      if (result.success && result.data) {
        setFields([...fields, result.data]);
        reset();
        onConfigurationSaved?.();
      } else {
        setError(result.error || 'Failed to save field');
      }
    } catch (err) {
      console.error('Error saving field:', err);
      setError(err instanceof Error ? err.message : 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const deleteField = async (fieldId: number) => {
    if (!confirm('Are you sure you want to delete this field?')) {
      return;
    }

    try {
      setError(null);

      const response = await fetch(API_ENDPOINTS.SAVE_CONFIGURATION, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ field_id: fieldId }),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        setFields(fields.filter(f => f.id !== fieldId));
      } else {
        setError(result.error || 'Failed to delete field');
      }
    } catch (err) {
      console.error('Error deleting field:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    }
  };

  useEffect(() => {
    if (template) {
      fetchFields();
    } else {
      setFields([]);
    }
  }, [template]);

  if (!template) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Template Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please select a template to configure fields.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configure Fields for "{template.name}"</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Add new field form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field_name">Field Name</Label>
              <Input
                id="field_name"
                {...register('field_name')}
                placeholder="e.g., customer_name"
              />
              {errors.field_name && (
                <p className="text-sm text-red-500">{errors.field_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="field_type">Field Type</Label>
              <Select onValueChange={(value) => setValue('field_type', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="x_position">X Position</Label>
              <Input
                id="x_position"
                type="number"
                step="0.1"
                {...register('x_position', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.x_position && (
                <p className="text-sm text-red-500">{errors.x_position.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="y_position">Y Position</Label>
              <Input
                id="y_position"
                type="number"
                step="0.1"
                {...register('y_position', { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.y_position && (
                <p className="text-sm text-red-500">{errors.y_position.message}</p>
              )}
            </div>

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
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add Field'}
          </Button>
        </form>

        {/* Existing fields list */}
        <div className="space-y-3">
          <h3 className="font-medium">Configured Fields</h3>
          {loading ? (
            <p className="text-gray-600">Loading fields...</p>
          ) : fields.length === 0 ? (
            <p className="text-gray-600">No fields configured yet.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{field.field_name}</span>
                      <span className="text-sm text-gray-500">({field.field_type})</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Position: ({field.x_position}, {field.y_position}) | Size: {field.font_size}px
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteField(field.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
