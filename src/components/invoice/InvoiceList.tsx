import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useInvoices,
  useGenerateInvoice,
  useDeleteInvoice,
  downloadBlob,
} from '@/hooks/useInvoices';
import type { Invoice } from '@/types/invoice';

interface InvoiceListProps {
  onInvoiceSelected?: (invoice: Invoice) => void;
}

export function InvoiceList({ onInvoiceSelected }: InvoiceListProps) {
  const { data: invoices = [], isLoading, error, refetch } = useInvoices();
  const generateMutation = useGenerateInvoice();
  const deleteMutation = useDeleteInvoice();

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const pdfBlob = await generateMutation.mutateAsync(invoice.id);
      const filename = `invoice-${invoice.id}-${new Date(invoice.generated_at).toISOString().split('T')[0]}.pdf`;
      downloadBlob(pdfBlob, filename);
    } catch (error) {
      console.error('Failed to download invoice:', error);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to delete invoice #${invoice.id}?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(invoice.id);
    } catch (error) {
      // Error is handled by TanStack Query's error state
      console.error('Delete error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading invoices...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invoices</CardTitle>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Failed to load invoices'}
            </p>
          </div>
        )}

        {generateMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">
              {generateMutation.error instanceof Error
                ? generateMutation.error.message
                : 'Failed to generate invoice'}
            </p>
          </div>
        )}

        {deleteMutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
            <p className="text-sm text-red-600">
              {deleteMutation.error instanceof Error
                ? deleteMutation.error.message
                : 'Failed to delete invoice'}
            </p>
          </div>
        )}

        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">No invoices found.</p>
            <p className="text-sm text-gray-500">
              Generate an invoice using the form on the right.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {invoice.template_name || `Invoice #${invoice.id}`}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      #{invoice.id}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Template: {invoice.template_name || `Template #${invoice.template_id}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Generated: {formatDate(invoice.generated_at)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadInvoice(invoice)}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? 'Generating...' : 'Download'}
                  </Button>
                  {onInvoiceSelected && (
                    <Button variant="default" size="sm" onClick={() => onInvoiceSelected(invoice)}>
                      View
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteInvoice(invoice)}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
