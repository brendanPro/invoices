import { Pool, PoolClient } from 'pg';

// Database connection pool for Netlify Functions
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });
  }

  return pool;
}

export async function withDatabase<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

// Database utility functions
export const db = {
  // Template operations
  async createTemplate(name: string, blobKey: string) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'INSERT INTO templates (name, blob_key) VALUES ($1, $2) RETURNING *',
        [name, blobKey]
      );
      return result.rows[0];
    });
  },

  async getTemplate(id: number) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'SELECT * FROM templates WHERE id = $1',
        [id]
      );
      return result.rows[0];
    });
  },

  async getAllTemplates() {
    return withDatabase(async (client) => {
      const result = await client.query(
        'SELECT * FROM templates ORDER BY created_at DESC'
      );
      return result.rows;
    });
  },

  async deleteTemplate(id: number) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'DELETE FROM templates WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0];
    });
  },

  // Template field operations
  async createTemplateField(templateId: number, fieldData: {
    field_name: string;
    x_position: number;
    y_position: number;
    font_size?: number;
    field_type?: string;
  }) {
    return withDatabase(async (client) => {
      const { field_name, x_position, y_position, font_size = 12, field_type = 'text' } = fieldData;
      const result = await client.query(
        'INSERT INTO template_fields (template_id, field_name, x_position, y_position, font_size, field_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [templateId, field_name, x_position, y_position, font_size, field_type]
      );
      return result.rows[0];
    });
  },

  async getTemplateFields(templateId: number) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'SELECT * FROM template_fields WHERE template_id = $1 ORDER BY field_name',
        [templateId]
      );
      return result.rows;
    });
  },

  async updateTemplateField(fieldId: number, fieldData: {
    field_name?: string;
    x_position?: number;
    y_position?: number;
    font_size?: number;
    field_type?: string;
  }) {
    return withDatabase(async (client) => {
      const updates = [];
      const values = [];
      let paramCount = 1;

      Object.entries(fieldData).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(fieldId);
      const result = await client.query(
        `UPDATE template_fields SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        values
      );
      return result.rows[0];
    });
  },

  async deleteTemplateField(fieldId: number) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'DELETE FROM template_fields WHERE id = $1 RETURNING *',
        [fieldId]
      );
      return result.rows[0];
    });
  },

  // Invoice operations
  async createInvoice(templateId: number, invoiceData: Record<string, any>, pdfBlobKey?: string) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'INSERT INTO invoices (template_id, invoice_data, pdf_blob_key) VALUES ($1, $2, $3) RETURNING *',
        [templateId, JSON.stringify(invoiceData), pdfBlobKey]
      );
      return result.rows[0];
    });
  },

  async getInvoice(id: number) {
    return withDatabase(async (client) => {
      const result = await client.query(
        'SELECT * FROM invoices WHERE id = $1',
        [id]
      );
      return result.rows[0];
    });
  },

  async getAllInvoices() {
    return withDatabase(async (client) => {
      const result = await client.query(
        'SELECT i.*, t.name as template_name FROM invoices i JOIN templates t ON i.template_id = t.id ORDER BY i.generated_at DESC'
      );
      return result.rows;
    });
  }
};
