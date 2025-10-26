import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CreateTemplateRequest, CreateTemplateResponse, ApiResponse } from '@/types/invoice';

const uploadSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  file: z.any().refine((file) => file instanceof File, 'Please select a PDF file'),
});

type UploadFormData = z.infer<typeof uploadSchema>;

interface TemplateUploadProps {
  onTemplateUploaded?: (template: any) => void;
}

export function TemplateUpload({ onTemplateUploaded }: TemplateUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      // Convert file to base64
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:application/pdf;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(data.file);
      });

      const requestData: CreateTemplateRequest = {
        name: data.name,
        file: data.file,
      };

      const response = await fetch('/api/upload-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          fileData,
        }),
      });

      const result: CreateTemplateResponse = await response.json();

      if (result.success && result.template) {
        setUploadSuccess(true);
        reset();
        onTemplateUploaded?.(result.template);
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
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
              <p className="text-sm text-red-500">{errors.file.message}</p>
            )}
            {selectedFile && (
              <p className="text-sm text-gray-600">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-600">Template uploaded successfully!</p>
            </div>
          )}

          <Button type="submit" disabled={isUploading} className="w-full">
            {isUploading ? 'Uploading...' : 'Upload Template'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
