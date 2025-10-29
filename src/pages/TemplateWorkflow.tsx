import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { TemplateWorkflowForm } from '@/components/templates/TemplateWorkflowForm';
import type { Template } from '@/types/index';

export function TemplateWorkflow() {
  const navigate = useNavigate();
  const [uploadedTemplate, setUploadedTemplate] = useState<Template | null>(null);

  const handleTemplateUploaded = (template: Template) => {
    setUploadedTemplate(template);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Create New Template
              </h1>
            </div>
            
            <Button
              onClick={() => navigate({ to: '/dashboard' })}
              variant="outline"
              size="sm"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full py-6 px-2 sm:px-4 lg:px-6">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
                1
              </div>
              <span className="ml-2 text-sm font-medium text-gray-900">Upload Template</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-500 rounded-full text-sm font-medium">
                2
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Configure Fields</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200"></div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-200 text-gray-500 rounded-full text-sm font-medium">
                3
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">Review & Save</span>
            </div>
          </div>
        </div>

        {/* Upload Form and Preview */}
        <TemplateWorkflowForm onSuccess={handleTemplateUploaded} />

        {/* Action Buttons */}
        {uploadedTemplate && (
          <div className="mt-8 flex justify-center space-x-4">
            <Button 
              disabled 
              title="Configure fields (coming soon)"
              className="px-6"
            >
              Configure Fields
            </Button>
            <Button 
              onClick={() => navigate({ to: '/dashboard' })}
              className="px-6"
            >
              Back to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
