import { z } from 'zod';
import { useInvoiceStore } from '../../store/invoiceStore';

// Define the schema for the tool
const getTotalInvoicesSchema = z.object({
  name: z.literal('getTotalInvoices'),
  description: z.literal('Get the total number of invoices in the system'),
  parameters: z.object({}),
});

// Tool implementation
export const getTotalInvoices = async () => {
  const { invoices } = useInvoiceStore.getState();
  return {
    type: 'success' as const,
    message: `There are ${invoices.length} invoices in the system.`,
    data: { count: invoices.length }
  };
};

// Export all tools
export const tools = [
  {
    name: 'getTotalInvoices',
    description: 'Get the total number of invoices in the system',
    parameters: getTotalInvoicesSchema.shape.parameters,
    execute: getTotalInvoices
  }
] as const;

// Type for tool results
export type ToolResult = {
  type: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
};

// Helper function to execute a tool
export const executeTool = async (toolName: string): Promise<ToolResult> => {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    return {
      type: 'error',
      message: `Tool ${toolName} not found`
    };
  }

  try {
    return await tool.execute();
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      type: 'error',
      message: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}; 