import React, { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { TemplateWorkflowForm } from '@/components/templates/TemplateWorkflowForm';
import { FieldConfigurationStep } from '@/components/templates/FieldConfigurationStep';
import { useTemplate } from '@/hooks/useTemplates';
import type { Template } from '@/types/index';

export function TemplateWorkflow() {
  const navigate = useNavigate();
  const { templateId } = useSearch({ from: '/templates' });
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedTemplate, setUploadedTemplate] = useState<Template | null>(null);
  
  // Fetch template if templateId is provided in query params
  const { data: fetchedTemplate, isLoading: isLoadingTemplate, error: templateError } = useTemplate(templateId || 0);
  
  // If templateId is provided, load the template and go to Step 2
  useEffect(() => {
    if (templateId && fetchedTemplate && !uploadedTemplate) {
      setUploadedTemplate(fetchedTemplate);
      setCurrentStep(2); // Go directly to Step 2 (Configure Fields)
    }
  }, [templateId, fetchedTemplate, uploadedTemplate]);

  const handleTemplateUploaded = (template: Template) => {
    setUploadedTemplate(template);
  };

  const handleConfigureFields = () => {
    setCurrentStep(2);
  };

  const handleFieldConfigComplete = () => {
    setCurrentStep(3); // Future: Review & Save
  };

  const handleBackToUpload = () => {
    setCurrentStep(1);
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
        {/* Loading State */}
        {templateId && isLoadingTemplate && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading template...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {templateId && templateError && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <p className="text-red-600 mb-4">
                {templateError instanceof Error ? templateError.message : 'Failed to load template'}
              </p>
              <Button onClick={() => navigate({ to: '/dashboard' })} variant="outline">
                Back to Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        {!(templateId && (isLoadingTemplate || templateError)) && (
          <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Upload Template
              </span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Configure Fields
              </span>
            </div>
            <div className={`flex-1 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <span className={`ml-2 text-sm font-medium ${
                currentStep >= 3 ? 'text-gray-900' : 'text-gray-500'
              }`}>
                Review & Save
              </span>
            </div>
          </div>
          </div>
        )}

        {/* Step Content */}
        {!(templateId && (isLoadingTemplate || templateError)) && (
          <>
            {currentStep === 1 && (
              <TemplateWorkflowForm onSuccess={handleTemplateUploaded} />
            )}

            {currentStep === 2 && uploadedTemplate && (
              <FieldConfigurationStep
                template={uploadedTemplate}
                onComplete={handleFieldConfigComplete}
                onBack={handleBackToUpload}
              />
            )}

            {/* Action Buttons for Step 1 */}
            {currentStep === 1 && uploadedTemplate && (
              <div className="mt-8 flex justify-center space-x-4">
                <Button 
                  onClick={handleConfigureFields}
                  className="px-6"
                >
                  Configure Fields
                </Button>
                <Button 
                  onClick={() => navigate({ to: '/dashboard' })}
                  variant="outline"
                  className="px-6"
                >
                  Back to Dashboard
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
