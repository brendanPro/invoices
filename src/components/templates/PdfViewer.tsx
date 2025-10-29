import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PdfViewerProps {
  file: File | null;
}

export function PdfViewer({ file }: PdfViewerProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setIsLoading(true);
      setError(null);
      
      // Clean up previous object URL
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      try {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load PDF preview');
        setIsLoading(false);
      }
    } else {
      // Clean up when no file
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setObjectUrl(null);
      }
      setError(null);
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file]);

  if (!file) {
    return (
      <Card className="w-full h-full max-w-none">
        <CardHeader>
          <CardTitle>PDF Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">Select a PDF file to preview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full max-w-none">
      <CardHeader>
        <CardTitle>PDF Preview</CardTitle>
        <div className="text-sm text-gray-600">
          <p><strong>File:</strong> {file.name}</p>
          <p><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Loading preview...</p>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {objectUrl && !isLoading && !error && (
          <div className="border rounded-lg overflow-hidden">
            <iframe
              src={objectUrl}
              width="100%"
              height="600"
              className="border-0 w-full"
              title="PDF Preview"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
