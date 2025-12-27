import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TemplateList } from '../templates/TemplateList';
import { InvoiceList } from './InvoiceList';
import { ConfigurationForm } from './ConfigurationForm';
import { InvoiceDataForm } from './InvoiceDataForm';
import { useGenerateInvoice, downloadBlob } from '@/hooks/useInvoices';
import type { Template } from '@/types/index';
import type { Invoice } from '@/types/invoice';

export function InvoiceGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const generateMutation = useGenerateInvoice();

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
    setSelectedInvoice(null);
  };

  const handleInvoiceSelected = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setGeneratedPdfUrl(null);
    
    try {
      const pdfBlob = await generateMutation.mutateAsync(invoice.id);
      const url = URL.createObjectURL(pdfBlob);
      setGeneratedPdfUrl(url);
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const handleDownloadCurrentInvoice = () => {
    if (!generatedPdfUrl || !selectedInvoice) return;

    fetch(generatedPdfUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const filename = `invoice-${selectedInvoice.id}-${new Date(selectedInvoice.generated_at).toISOString().split('T')[0]}.pdf`;
        downloadBlob(blob, filename);
      })
      .catch((error) => {
        console.error('Failed to download invoice:', error);
      });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    return () => {
      if (generatedPdfUrl) {
        URL.revokeObjectURL(generatedPdfUrl);
      }
    };
  }, [generatedPdfUrl]);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Template Management */}
        <div className="space-y-6">
          <TemplateList
            onTemplateSelect={handleTemplateSelected}
            onTemplateDeleted={handleTemplateDeleted}
          />
        </div>

        {/* Middle Column - Configuration and Generation */}
        <div className="space-y-6">
          <InvoiceDataForm
            template={selectedTemplate}
            onInvoiceGenerated={handleInvoiceGenerated}
          />
        </div>

        {/* Right Column - Invoice List */}
        <div className="space-y-6">
          <InvoiceList onInvoiceSelected={handleInvoiceSelected} />
        </div>
      </div>

      {/* Generated PDF Display */}
      {generatedPdfUrl && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              {selectedInvoice 
                ? `Invoice #${selectedInvoice.id}` 
                : 'Generated Invoice'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedInvoice ? (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Template: {selectedInvoice.template_name || `Template #${selectedInvoice.template_id}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Generated: {formatDate(selectedInvoice.generated_at)}
                  </p>
                </div>
              ) : (
                <p className="text-green-600 font-medium">Invoice generated successfully!</p>
              )}

              {generateMutation.isPending && (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading invoice...</p>
                  </div>
                </div>
              )}

              {generateMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                  <p className="text-sm text-red-600">
                    {generateMutation.error instanceof Error
                      ? generateMutation.error.message
                      : 'Failed to load invoice'}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                {selectedInvoice ? (
                  <>
                    <Button
                      onClick={handleDownloadCurrentInvoice}
                      disabled={!generatedPdfUrl}
                    >
                      Download Invoice
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedInvoice(null);
                        setGeneratedPdfUrl(null);
                      }}
                    >
                      Close
                    </Button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {generatedPdfUrl && !generateMutation.isPending && (
                <div className="mt-4">
                  <iframe
                    src={generatedPdfUrl}
                    width="100%"
                    height="600"
                    className="border rounded-lg"
                    title={selectedInvoice ? `Invoice #${selectedInvoice.id}` : 'Generated Invoice'}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
