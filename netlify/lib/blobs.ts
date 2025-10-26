import { getStore } from '@netlify/blobs';

// Get the templates store
export function getTemplatesStore() {
  return getStore('templates');
}

// Blob storage utility functions
export const blobs = {
  async uploadTemplate(key: string, buffer: Buffer): Promise<void> {
    const store = getTemplatesStore();
    await store.set(key, buffer);
  },

  async getTemplate(key: string): Promise<Buffer> {
    const store = getTemplatesStore();
    const blob = await store.get(key, { type: 'buffer' });
    if (!blob) {
      throw new Error(`Template with key ${key} not found`);
    }
    return blob as Buffer;
  },

  async deleteTemplate(key: string): Promise<void> {
    const store = getTemplatesStore();
    await store.delete(key);
  },

  async listTemplates(): Promise<string[]> {
    const store = getTemplatesStore();
    const { blobs } = await store.list();
    return blobs.map(blob => blob.key);
  }
};
