import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUploadTemplate } from '@/hooks/useTemplates';

const uploadSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  file: z.any().refine((file) => {
    if (!file) return false;
    const actualFile = file instanceof File ? file : file[0];
    if (!actualFile || !(actualFile instanceof File)) return false;
    return actualFile.type === 'application/pdf';
  }, 'Please select a valid PDF file'),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface TemplateUploadProps {
  onTemplateUploaded?: (template: any) => void;
}

export function TemplateUpload({ onTemplateUploaded }: TemplateUploadProps) {
  const uploadMutation = useUploadTemplate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  });

  const selectedFile = watch('file');

  const onSubmit = async (data: UploadFormData) => {
    try {
      // Extract the actual file from the form data
      const file = data.file instanceof File ? data.file : data.file[0];
      if (!file) {
        throw new Error('Please select a PDF file');
      }

      const template = await uploadMutation.mutateAsync({
        name: data.name,
        file,
      });

      reset();
      onTemplateUploaded?.(template);
    } catch (error) {
      console.error('Upload error:', error);
      // Error is handled by TanStack Query's error state
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Template</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter template name"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="file">PDF File</Label>
            <Input
              id="file"
              type="file"
              accept=".pdf"
              {...register('file')}
            />
            {errors.file && (
              <p className="text-sm text-red-500">{errors.file.message as string}</p>
            )}
            {selectedFile && (
              <p className="text-sm text-gray-600">
                Selected: {selectedFile instanceof File ? selectedFile.name : selectedFile[0]?.name || 'Unknown file'}
              </p>
            )}
          </div>

          {uploadMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                {uploadMutation.error instanceof Error 
                  ? uploadMutation.error.message 
                  : 'Upload failed'}
              </p>
            </div>
          )}

          {uploadMutation.isSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">Template uploaded successfully!</p>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={uploadMutation.isPending} 
            className="w-full"
          >
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Template'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
