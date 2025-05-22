import { z } from 'zod';
import { useInvoiceStore } from '../store/invoiceStore';

interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  CustomerRef: {
    name: string;
  };
  TotalAmt: number;
  Balance: number;
  status: string;
}

interface InvoiceDetails {
  id: string;
  documentNumber: string;
  date: string;
  customer: string;
  totalAmount: number;
  balance: number;
  status: string;
}

interface GetInvoiceDetailsParams {
  identifier: string;
}

// Define the tool schema
const totalInvoicesSchema = z.object({});
const invoiceDetailsSchema = z.object({
  identifier: z.string().describe('The ID or document number of the invoice to retrieve'),
});

// Tool schemas
const getTotalInvoicesSchema = z.object({});

// Tool result types
interface InvoiceBreakdown {
  paid: number;
  unpaid: number;
  overdue: number;
}

export interface TotalInvoicesData {
  count: number;
  breakdown: InvoiceBreakdown;
}

// Tool implementations
export const invoiceTools = {
  /**
   * Get total number of invoices
   */
  getTotalInvoices: {
    description: 'Get the total number of invoices in the system',
    parameters: getTotalInvoicesSchema,
    execute: async (): Promise<ToolResult<TotalInvoicesData>> => {
      const { invoices } = useInvoiceStore.getState();
      return {
        type: 'success',
        message: `There are ${invoices.length} invoices in the system.`,
        data: { 
          count: invoices.length,
          breakdown: {
            paid: invoices.filter(inv => inv.status === 'Paid').length,
            unpaid: invoices.filter(inv => inv.status === 'Unpaid').length,
            overdue: invoices.filter(inv => inv.status === 'Overdue').length
          }
        }
      };
    }
  },

  /**
   * Get details of a specific invoice
   */
  getInvoiceDetails: {
    description: 'Get detailed information about a specific invoice by its ID or document number',
    parameters: invoiceDetailsSchema,
    execute: async ({ identifier }: GetInvoiceDetailsParams) => {
      try {
        const response = await fetch('/api/quickbooks/invoices');
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }
        const invoices = await response.json();
        
        // Search for invoice by ID or document number
        const invoice = invoices.find((inv: Invoice) => 
          inv.Id === identifier || inv.DocNumber === identifier
        );

        if (!invoice) {
          return {
            found: false,
            message: `No invoice found with identifier: ${identifier}`
          };
        }

        return {
          found: true,
          invoice: {
            id: invoice.Id,
            documentNumber: invoice.DocNumber,
            date: new Date(invoice.TxnDate).toLocaleDateString(),
            customer: invoice.CustomerRef.name,
            totalAmount: invoice.TotalAmt,
            balance: invoice.Balance,
            status: invoice.status
          } as InvoiceDetails,
          message: `Found invoice #${invoice.DocNumber} for ${invoice.CustomerRef.name}`
        };
      } catch (error) {
        console.error('Error getting invoice details:', error);
        throw new Error('Failed to get invoice details');
      }
    }
  },

  /**
   * Calculate total amount of all invoices
   */
  getTotalAmount: (invoices: Invoice[]): number => {
    return invoices.reduce((sum, invoice) => sum + (invoice.TotalAmt || 0), 0);
  },

  /**
   * Calculate total outstanding balance
   */
  getTotalBalance: (invoices: Invoice[]): number => {
    return invoices.reduce((sum, invoice) => sum + (invoice.Balance || 0), 0);
  },

  /**
   * Get invoices by date range
   */
  getInvoicesByDateRange: (invoices: Invoice[], startDate: string, endDate: string): Invoice[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.TxnDate);
      return invoiceDate >= start && invoiceDate <= end;
    });
  },

  /**
   * Get invoices by customer
   */
  getInvoicesByCustomer: (invoices: Invoice[], customerName: string): Invoice[] => {
    return invoices.filter(invoice => 
      invoice.CustomerRef.name.toLowerCase().includes(customerName.toLowerCase())
    );
  },

  /**
   * Get summary statistics
   */
  getSummary: (invoices: Invoice[]) => {
    return {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, invoice) => sum + (invoice.TotalAmt || 0), 0),
      totalBalance: invoices.reduce((sum, invoice) => sum + (invoice.Balance || 0), 0),
      averageAmount: invoices.length > 0 
        ? invoices.reduce((sum, invoice) => sum + (invoice.TotalAmt || 0), 0) / invoices.length 
        : 0,
      customerCount: new Set(invoices.map(invoice => invoice.CustomerRef.name)).size
    };
  }
} as const;

// Type for tool results
export type ToolResult<T = unknown> = {
  type: 'success' | 'error';
  message: string;
  data?: T;
};

// Helper function to execute a tool
export const executeTool = async <T = unknown>(toolName: string): Promise<ToolResult<T>> => {
  const tool = invoiceTools[toolName as keyof typeof invoiceTools];
  if (!tool) {
    return {
      type: 'error',
      message: `Tool ${toolName} not found`
    };
  }

  try {
    return await tool.execute() as ToolResult<T>;
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      type: 'error',
      message: `Failed to execute ${toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const invoiceUtils = {
  /**
   * Calculate total amount of all invoices
   */
  getTotalAmount: (invoices: Invoice[]): number => {
    return invoices.reduce((sum, invoice) => sum + (invoice.TotalAmt || 0), 0);
  },

  /**
   * Calculate total outstanding balance
   */
  getTotalBalance: (invoices: Invoice[]): number => {
    return invoices.reduce((sum, invoice) => sum + (invoice.Balance || 0), 0);
  },

  /**
   * Get invoices by date range
   */
  getInvoicesByDateRange: (invoices: Invoice[], startDate: string, endDate: string): Invoice[] => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.TxnDate);
      return invoiceDate >= start && invoiceDate <= end;
    });
  },

  /**
   * Get invoices by customer
   */
  getInvoicesByCustomer: (invoices: Invoice[], customerName: string): Invoice[] => {
    return invoices.filter(invoice => 
      invoice.CustomerRef.name.toLowerCase().includes(customerName.toLowerCase())
    );
  },

  /**
   * Get summary statistics
   */
  getSummary: (invoices: Invoice[]) => {
    return {
      totalInvoices: invoices.length,
      totalAmount: invoices.reduce((sum, invoice) => sum + (invoice.TotalAmt || 0), 0),
      totalBalance: invoices.reduce((sum, invoice) => sum + (invoice.Balance || 0), 0),
      averageAmount: invoices.length > 0 
        ? invoices.reduce((sum, invoice) => sum + (invoice.TotalAmt || 0), 0) / invoices.length 
        : 0,
      customerCount: new Set(invoices.map(invoice => invoice.CustomerRef.name)).size
    };
  }
}; 