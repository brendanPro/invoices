import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Template, TemplateField, ApiResponse } from '@/types/index';
import { API_ENDPOINTS } from '@/lib/api';

interface InvoiceDataFormProps {
  template: Template | null;
  onInvoiceGenerated?: (pdfUrl: string) => void;
}

export function InvoiceDataForm({ template, onInvoiceGenerated }: InvoiceDataFormProps) {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Create dynamic schema based on fields
  const createSchema = (templateFields: TemplateField[]) => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    templateFields.forEach(field => {
      switch (field.field_type) {
        case 'number':
          schemaFields[field.field_name] = z.number().optional();
          break;
        case 'date':
          schemaFields[field.field_name] = z.string().optional();
          break;
        default:
          schemaFields[field.field_name] = z.string().optional();
      }
    });

    return z.object(schemaFields);
  };

  const [schema, setSchema] = useState(createSchema([]));
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const fetchFields = async () => {
    if (!template) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.GET_CONFIGURATION + `?template_id=${template.id}`);
      const result: ApiResponse<TemplateField[]> = await response.json();

      if (result.success && result.data) {
        setFields(result.data);
        const newSchema = createSchema(result.data);
        setSchema(newSchema);
      } else {
        setError(result.error || 'Failed to load fields');
      }
    } catch (err) {
      console.error('Error fetching fields:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: Record<string, any>) => {
    if (!template) return;

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.GENERATE_INVOICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_id: template.id,
          invoice_data: data,
        }),
      });

      const result = await response.json();

      if (result.success && result.pdf_url) {
        onInvoiceGenerated?.(result.pdf_url);
        reset();
      } else {
        setError(result.error || 'Failed to generate invoice');
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (template) {
      fetchFields();
    } else {
      setFields([]);
      setSchema(createSchema([]));
    }
  }, [template]);

  if (!template) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invoice Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please select a template to enter invoice data.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invoice Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Loading fields...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Enter Invoice Data for "{template.name}"</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {fields.length === 0 ? (
          <p className="text-gray-600">
            No fields configured for this template. Please configure fields first.
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.field_name}>
                    {field.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  
                  {field.field_type === 'date' ? (
                    <Input
                      id={field.field_name}
                      type="date"
                      {...register(field.field_name)}
                    />
                  ) : field.field_type === 'number' ? (
                    <Input
                      id={field.field_name}
                      type="number"
                      step="0.01"
                      {...register(field.field_name, { valueAsNumber: true })}
                    />
                  ) : (
                    <Input
                      id={field.field_name}
                      type="text"
                      {...register(field.field_name)}
                    />
                  )}
                  
                  {errors[field.field_name] && (
                    <p className="text-sm text-red-500">
                      {errors[field.field_name]?.message as string}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button type="submit" disabled={generating} className="w-full">
              {generating ? 'Generating Invoice...' : 'Generate Invoice'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
