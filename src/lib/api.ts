// API Configuration for Invoice Generator
// This file can be modified to change the API base URL

export const API_CONFIG = {
  // Change this URL based on your environment
  BASE_URL: process.env.BUN_PUBLIC_BACKEND_URL || 'http://localhost:9999', // Default for local development
};

// API endpoints
export const API_ENDPOINTS = {
  // Template management (consolidated endpoint)
  TEMPLATES: `${API_CONFIG.BASE_URL}/api/templates`,
  
  // Configuration management
  SAVE_CONFIGURATION: `${API_CONFIG.BASE_URL}/api/save-configuration`,
  GET_CONFIGURATION: `${API_CONFIG.BASE_URL}/api/get-configuration`,
  
  // Invoice generation
  GENERATE_INVOICE: `${API_CONFIG.BASE_URL}/api/generate-invoice`,
};