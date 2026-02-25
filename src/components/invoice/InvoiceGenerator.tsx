import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TemplateList } from '../templates/TemplateList';
import { InvoiceList } from './InvoiceList';
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
    setSelectedInvoice(null);
  };

  const handleTemplateDeleted = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
      setGeneratedPdfUrl(null);
      setSelectedInvoice(null);
    }
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setGeneratedPdfUrl(null);
    setSelectedInvoice(null);
  };

  const handleInvoiceGenerated = (pdfUrl: string) => {
    setGeneratedPdfUrl(pdfUrl);
    setSelectedInvoice(null);
  };

  const handleInvoiceSelected = async (invoice: Invoice) => {
    if (selectedInvoice?.id === invoice.id) {
      setSelectedInvoice(null);
      setGeneratedPdfUrl(null);
      return;
    }

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

  const handleClosePdfViewer = () => {
    setSelectedInvoice(null);
    setGeneratedPdfUrl(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Invoice Generator</h1>
        <p className="text-gray-600">
          Upload PDF templates, configure fields, and generate invoices
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column — Template list or Invoice data form */}
        <div className="space-y-4">
          {selectedTemplate === null ? (
            <TemplateList
              onTemplateSelect={handleTemplateSelected}
              onTemplateDeleted={handleTemplateDeleted}
            />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToTemplates}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-800 -ml-1"
              >
                ← Retour aux templates
              </Button>
              <InvoiceDataForm
                template={selectedTemplate}
                onInvoiceGenerated={handleInvoiceGenerated}
              />
            </>
          )}
        </div>

        {/* Right Column — Invoice list */}
        <div className="space-y-4">
          <InvoiceList onInvoiceSelected={handleInvoiceSelected} />
        </div>
      </div>

      {/* PDF Viewer — full width, below the grid */}
      {(generatedPdfUrl || generateMutation.isPending) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">
              {selectedInvoice ? `Facture #${selectedInvoice.id}` : 'Facture générée'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={handleClosePdfViewer}>
              ✕
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedInvoice && (
              <div>
                <p className="text-sm text-gray-600">
                  Template : {selectedInvoice.template_name || `#${selectedInvoice.template_id}`}
                </p>
                <p className="text-xs text-gray-400">
                  Générée le {formatDate(selectedInvoice.generated_at)}
                </p>
              </div>
            )}

            {!selectedInvoice && generatedPdfUrl && (
              <p className="text-sm text-green-600 font-medium">
                Facture générée avec succès !
              </p>
            )}

            {generateMutation.isPending && (
              <div className="flex items-center justify-center py-6">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Chargement...</p>
                </div>
              </div>
            )}

            {generateMutation.isError && (
              <p className="text-sm text-red-600">
                {generateMutation.error instanceof Error
                  ? generateMutation.error.message
                  : 'Erreur lors du chargement'}
              </p>
            )}

            {generatedPdfUrl && !generateMutation.isPending && (
              <>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDownloadCurrentInvoice}>
                    Télécharger
                  </Button>
                </div>
                <iframe
                  src={generatedPdfUrl}
                  width="100%"
                  height="700"
                  className="border rounded-lg mt-2"
                  title={selectedInvoice ? `Facture #${selectedInvoice.id}` : 'Facture générée'}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
