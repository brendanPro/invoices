// API Configuration for Invoice Generator
// This file can be modified to change the API base URL

import { getJWTToken } from './auth';

export const API_CONFIG = {
  // Change this URL based on your environment
  BASE_URL: process.env.BUN_PUBLIC_BACKEND_URL || 'http://localhost:9999', // Default for local development
};

// API endpoints
export const API_ENDPOINTS = {
  // Template management (consolidated endpoint)
  TEMPLATES: `${API_CONFIG.BASE_URL}/api/templates`,
  FIELDS: (templateId) => `${API_ENDPOINTS.TEMPLATES}/${templateId}/fields`,
  // PDF fetch endpoint
  PDF: `${API_CONFIG.BASE_URL}/api/pdf`,

  // Invoice generation
  INVOICES: `${API_CONFIG.BASE_URL}/api/invoices`,
};

/**
 * Get authentication headers for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getJWTToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Make authenticated API request
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 responses by redirecting to login
  if (response.status === 401) {
    // Clear any stored auth data from sessionStorage
    sessionStorage.removeItem('invoice_generator_auth');
    sessionStorage.removeItem('invoice_generator_token');
    sessionStorage.removeItem('oauth_state');

    // Redirect to login page
    window.location.href = '/login';
  }

  return response;
}
