import { z } from 'zod';
import { Invoice } from '../store/invoiceStore';

// Tool schemas
const totalInvoicesSchema = z.object({});
const totalAmountDueSchema = z.object({});
const unpaidInvoicesSchema = z.object({});

// Tool implementations
const getTotalInvoices = async () => {
  const response = await fetch('/api/quickbooks/invoices');
  if (!response.ok) {
    throw new Error('Failed to fetch invoices');
  }
  const invoices = await response.json();
  return {
    type: 'success' as const,
    message: `There are ${invoices.length} invoices in the system.`,
    data: { count: invoices.length }
  };
};

const getTotalAmountDue = async () => {
  const response = await fetch('/api/quickbooks/invoices');
  if (!response.ok) {
    throw new Error('Failed to fetch invoices');
  }
  const invoices = await response.json();
  const totalDue = invoices.reduce((sum: number, invoice: Invoice) => sum + (invoice.Balance || 0), 0);
  return {
    type: 'success' as const,
    message: `The total amount due is $${totalDue.toFixed(2)}.`,
    data: { amount: totalDue }
  };
};

const getUnpaidInvoices = async () => {
  const response = await fetch('/api/quickbooks/invoices');
  if (!response.ok) {
    throw new Error('Failed to fetch invoices');
  }
  const invoices = await response.json();
  const unpaidInvoices = invoices.filter((invoice: Invoice) => invoice.Balance > 0);
  return {
    type: 'success' as const,
    message: `Found ${unpaidInvoices.length} unpaid invoices.`,
    data: { invoices: unpaidInvoices }
  };
};

// Tool registry
export const tools = [
  {
    name: 'getTotalInvoices',
    description: 'Get the total number of invoices in the system',
    parameters: totalInvoicesSchema,
    execute: getTotalInvoices
  },
  {
    name: 'getTotalAmountDue',
    description: 'Get the total amount due across all invoices',
    parameters: totalAmountDueSchema,
    execute: getTotalAmountDue
  },
  {
    name: 'getUnpaidInvoices',
    description: 'Get a list of all unpaid invoices',
    parameters: unpaidInvoicesSchema,
    execute: getUnpaidInvoices
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