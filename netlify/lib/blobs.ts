import { getStore } from '@netlify/blobs';

// Get the templates store
export function getTemplatesStore() {
  // @ts-ignore
  return getStore('templates',{
    siteId: "43fd6547-859b-4339-8f13-0b99c93a8ea9",
    token: "nfp_pSCD9YeSrv3iGovjvVk6bo5gC5n9dJWy4bf0"
  });
}

// Blob storage utility functions
export const blobs = {
  async uploadTemplate(key: string, buffer: ArrayBuffer): Promise<void> {
    const store = getTemplatesStore();
    await store.set(key, buffer);
  },

  async getTemplate(key: string): Promise<ArrayBuffer> {
    const store = getTemplatesStore();
    const blob = await store.get(key, { type: 'arrayBuffer' });
    if (!blob) {
      throw new Error(`Template with key ${key} not found`);
    }
    return blob;
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
