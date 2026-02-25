import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Template } from '@/types/index';
import type { TemplateField } from '@/types/template-field';
import type { TemplateFieldGroup } from '@/types/template-group';
import { useTemplateFields } from '@/hooks/useTemplateFields';
import { useTemplateGroups } from '@/hooks/useTemplateGroups';
import { useSaveInvoiceData, useGenerateInvoice, downloadBlob } from '@/hooks/useInvoices';

interface InvoiceDataFormProps {
  template: Template | null;
  onInvoiceGenerated?: (pdfUrl: string) => void;
}

interface FieldInputProps {
  field: TemplateField;
  register: ReturnType<typeof useForm>['register'];
  errors: ReturnType<typeof useForm>['formState']['errors'];
}

function FieldInput({ field, register, errors }: FieldInputProps) {
  const label = field.field_name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="space-y-2">
      <Label htmlFor={field.field_name}>{label}</Label>
      {field.field_type === 'date' ? (
        <Input id={field.field_name} type="date" {...register(field.field_name)} />
      ) : field.field_type === 'number' ? (
        <Input
          id={field.field_name}
          type="number"
          step="0.01"
          {...register(field.field_name, { valueAsNumber: true })}
        />
      ) : (
        <Input id={field.field_name} type="text" {...register(field.field_name)} />
      )}
      {errors[field.field_name] && (
        <p className="text-sm text-red-500">{errors[field.field_name]?.message as string}</p>
      )}
    </div>
  );
}

interface FieldGroupSectionProps {
  group: TemplateFieldGroup;
  fields: TemplateField[];
  register: ReturnType<typeof useForm>['register'];
  errors: ReturnType<typeof useForm>['formState']['errors'];
}

function FieldGroupSection({ group, fields, register, errors }: FieldGroupSectionProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{group.name}</span>
        <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">
          {fields.length} champ{fields.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => (
          <FieldInput key={field.id} field={field} register={register} errors={errors} />
        ))}
      </div>
    </div>
  );
}

export function InvoiceDataForm({ template, onInvoiceGenerated }: InvoiceDataFormProps) {
  const [error, setError] = useState<string | null>(null);

  // Fetch template fields and groups using React Query hooks
  const templateId = useMemo(() => (template ? Number(template.id) : 0), [template]);
  const {
    data: fields = [],
    isLoading: fieldsLoading,
    error: fieldsError,
  } = useTemplateFields(templateId);
  const { data: groups = [], isLoading: groupsLoading } = useTemplateGroups(templateId);

  const loading = fieldsLoading || groupsLoading;

  const { groupedFields, ungroupedFields } = useMemo(() => {
    const grouped = new Map<number, TemplateField[]>();
    const ungrouped: TemplateField[] = [];

    fields.forEach((field) => {
      if (field.group_id != null) {
        const existing = grouped.get(field.group_id) ?? [];
        grouped.set(field.group_id, [...existing, field]);
      } else {
        ungrouped.push(field);
      }
    });

    return { groupedFields: grouped, ungroupedFields: ungrouped };
  }, [fields]);

  // Invoice mutations
  const saveInvoiceMutation = useSaveInvoiceData();
  const generateInvoiceMutation = useGenerateInvoice();

  // Computed loading state
  const isProcessing = saveInvoiceMutation.isPending || generateInvoiceMutation.isPending;

  // Create dynamic schema based on fields
  const schema = useMemo(() => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    fields.forEach((field) => {
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
  }, [fields]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Record<string, any>) => {
    if (!template) return;

    try {
      setError(null);

      // Step 1: Save invoice data (POST /api/invoices)
      const savedInvoice = await saveInvoiceMutation.mutateAsync({
        templateId: template.id,
        invoiceData: data,
      });

      // Step 2: Generate invoice PDF (GET /api/invoices/:id)
      const pdfBlob = await generateInvoiceMutation.mutateAsync(savedInvoice.id);

      // Download the PDF blob
      const filename = `invoice-${savedInvoice.id}-${new Date().toISOString().split('T')[0]}.pdf`;
      downloadBlob(pdfBlob, filename);

      // Create object URL for preview (if callback is provided)
      const pdfUrl = URL.createObjectURL(pdfBlob);
      onInvoiceGenerated?.(pdfUrl);

      reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process invoice';
      setError(errorMessage);
    }
  };

  // Update error state when fields error occurs
  useEffect(() => {
    if (fieldsError) {
      setError(fieldsError instanceof Error ? fieldsError.message : 'Failed to load fields');
    }
  }, [fieldsError]);

  // Reset form when template changes
  useEffect(() => {
    if (template) {
      reset();
      setError(null);
    }
  }, [template?.id, reset]);

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
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading fields...</p>
            </div>
          </div>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {groups
              .filter((group) => groupedFields.has(group.id))
              .map((group) => (
                <FieldGroupSection
                  key={group.id}
                  group={group}
                  fields={groupedFields.get(group.id) ?? []}
                  register={register}
                  errors={errors}
                />
              ))}

            {ungroupedFields.length > 0 && (
              <div className="space-y-3">
                {groups.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Sans groupe
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ungroupedFields.map((field) => (
                    <FieldInput
                      key={field.id}
                      field={field}
                      register={register}
                      errors={errors}
                    />
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={isProcessing} className="w-full">
              {isProcessing
                ? saveInvoiceMutation.isPending
                  ? 'Saving Data...'
                  : 'Generating Invoice...'
                : 'Save Data & Generate Invoice'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
