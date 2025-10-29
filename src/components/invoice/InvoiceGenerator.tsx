import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateList } from '../templates/TemplateList';
import { ConfigurationForm } from './ConfigurationForm';
import { InvoiceDataForm } from './InvoiceDataForm';
import type { Template } from '@/types/index';

export function InvoiceGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);


  const handleTemplateSelected = (template: Template) => {
    setSelectedTemplate(template);
    setGeneratedPdfUrl(null);
  };

  const handleTemplateDeleted = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
      setGeneratedPdfUrl(null);
    }
  };

  const handleConfigurationSaved = () => {
    console.log('Configuration saved successfully');
  };

  const handleInvoiceGenerated = (pdfUrl: string) => {
    setGeneratedPdfUrl(pdfUrl);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header - Title and Description */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Invoice Generator</h1>
        <p className="text-gray-600">
          Upload PDF templates, configure fields, and generate invoices
        </p>
      </div>

      {/* Main Content - Template Management and Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Template Management */}
        <div className="space-y-6">
          <TemplateList
            onTemplateSelect={handleTemplateSelected}
            onTemplateDeleted={handleTemplateDeleted}
          />
        </div>

        {/* Right Column - Configuration and Generation */}
        <div className="space-y-6">
          <ConfigurationForm
            template={selectedTemplate}
            onConfigurationSaved={handleConfigurationSaved}
          />
          <InvoiceDataForm
            template={selectedTemplate}
            onInvoiceGenerated={handleInvoiceGenerated}
          />
        </div>
      </div>

      {/* Generated PDF Display */}
      {generatedPdfUrl && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generated Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-green-600 font-medium">
                Invoice generated successfully!
              </p>
              <div className="flex gap-4">
                <a
                  href={generatedPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View PDF
                </a>
                <a
                  href={generatedPdfUrl}
                  download={`invoice-${Date.now()}.pdf`}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Download PDF
                </a>
              </div>
              <div className="mt-4">
                <iframe
                  src={generatedPdfUrl}
                  width="100%"
                  height="600"
                  className="border rounded-lg"
                  title="Generated Invoice"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
