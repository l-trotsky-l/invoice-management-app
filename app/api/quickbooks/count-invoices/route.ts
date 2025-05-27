import { tool } from 'ai';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Define a strict empty schema
const emptySchema = z.object({}).strict();

// Define the response schema
const countResponseSchema = z.object({
  count: z.number(),
  message: z.string()
});

export const countInvoicesTool = tool({
  description: 'Count the total number of invoices in the system by reading the invoices.txt file',
  parameters: emptySchema,
  execute: async () => {
    try {
      const filePath = join(process.cwd(), 'public', 'invoices.txt');
      const content = await readFile(filePath, 'utf-8');
      const count = (content.match(/===========================================/g) || []).length / 2;
      
      const response = countResponseSchema.parse({
        count,
        message: `There are ${count} invoices in the system.`
      });

      return response.message;
    } catch (error) {
      console.error('Error counting invoices:', error);
      return 'Error: Unable to count invoices. The file may not exist or be accessible.';
    }
  }
});
