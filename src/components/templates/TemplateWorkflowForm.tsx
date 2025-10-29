import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUploadTemplate } from '@/hooks/useTemplates';
import { PdfViewer } from './PdfViewer';
import type { Template } from '@/types/index';

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

interface TemplateWorkflowFormProps {
  onSuccess?: (template: Template) => void;
}

export function TemplateWorkflowForm({ onSuccess }: TemplateWorkflowFormProps) {
  const uploadMutation = useUploadTemplate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  });

  const watchedFile = watch('file');

  // Update selected file when form file changes
  useEffect(() => {
    if (watchedFile) {
      const file = watchedFile instanceof File ? watchedFile : watchedFile[0];
      if (file && file instanceof File) {
        setSelectedFile(file);
      }
    } else {
      setSelectedFile(null);
    }
  }, [watchedFile]);

  // Auto-dismiss success message after 2 seconds
  useEffect(() => {
    if (uploadMutation.isSuccess) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [uploadMutation.isSuccess]);

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
      setSelectedFile(null);
      onSuccess?.(template);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-none">
      {/* Left Column - Upload Form */}
      <Card className="w-full max-w-none">
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
                  Selected: {selectedFile.name}
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

            {showSuccess && (
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

      {/* Right Column - PDF Preview */}
      <PdfViewer file={selectedFile} />
    </div>
  );
}
