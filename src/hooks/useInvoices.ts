import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice } from '@/types/invoice';
import { API_ENDPOINTS, authenticatedFetch } from '@/lib/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Save invoice data (POST /api/invoices)
 */
async function saveInvoiceData(
  templateId: number,
  invoiceData: Record<string, any>,
): Promise<Invoice> {
  const response = await authenticatedFetch(API_ENDPOINTS.INVOICES, {
    method: 'POST',
    body: JSON.stringify({
      template_id: templateId,
      invoice_data: invoiceData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save invoice data: ${response.statusText}`);
  }

  const result: ApiResponse<Invoice> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to save invoice data');
  }
}

/**
 * Generate invoice PDF (GET /api/invoices/:id)
 * Returns a Blob of the PDF file
 */
async function generateInvoice(invoiceId: number): Promise<Blob> {
  const response = await authenticatedFetch(`${API_ENDPOINTS.INVOICES}/${invoiceId}`, {
    method: 'GET',
  });

  if (!response.ok) {
    // Try to parse error message if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error || `Failed to generate invoice: ${response.statusText}`);
    }
    throw new Error(`Failed to generate invoice: ${response.statusText}`);
  }

  // Response should be a PDF blob
  const blob = await response.blob();

  // Verify it's a PDF
  if (!blob.type.includes('pdf')) {
    throw new Error('Invalid response: expected PDF file');
  }

  return blob;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Hook for saving invoice data
 */
export function useSaveInvoiceData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      invoiceData,
    }: {
      templateId: number;
      invoiceData: Record<string, any>;
    }) => saveInvoiceData(templateId, invoiceData),
    onSuccess: () => {
      // Invalidate invoices list to refresh after creating a new invoice
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error('Invoice data save failed:', error);
    },
  });
}

/**
 * Hook for generating invoice PDF
 */
export function useGenerateInvoice() {
  return useMutation({
    mutationFn: (invoiceId: number) => generateInvoice(invoiceId),
    onError: (error) => {
      console.error('Invoice generation failed:', error);
    },
  });
}

/**
 * List all invoices (GET /api/invoices)
 */
async function fetchInvoices(): Promise<Invoice[]> {
  const response = await authenticatedFetch(API_ENDPOINTS.INVOICES, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch invoices: ${response.statusText}`);
  }

  const result: ApiResponse<Invoice[]> = await response.json();

  if (result.success && result.data) {
    return result.data;
  } else {
    throw new Error(result.error || 'Failed to load invoices');
  }
}

/**
 * Delete invoice (DELETE /api/invoices/:id)
 */
async function deleteInvoice(invoiceId: number): Promise<void> {
  const response = await authenticatedFetch(`${API_ENDPOINTS.INVOICES}/${invoiceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    // Try to parse error message if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error || `Failed to delete invoice: ${response.statusText}`);
    }
    throw new Error(`Failed to delete invoice: ${response.statusText}`);
  }

  const result: ApiResponse<void> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete invoice');
  }
}

/**
 * Hook for listing invoices
 */
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for deleting invoice
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: number) => deleteInvoice(invoiceId),
    onSuccess: () => {
      // Invalidate and refetch invoices list after successful deletion
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (error) => {
      console.error('Invoice deletion failed:', error);
    },
  });
}
