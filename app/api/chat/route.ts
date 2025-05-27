import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { cookies } from 'next/headers';

interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate?: string;
  CustomerRef: {
    name: string;
    value: string;
  };
  TotalAmt: number;
  Balance: number;
  Deposit?: number;
  customerName?: string;
  MetaData?: {
    LastUpdatedTime?: string;
  };
}

interface CustomerInvoicesResponse {
  message?: string;
  error?: string;
  invoices: Invoice[];
}

interface FormattedInvoice {
  invoiceNumber: string;
  date: string;
  amount: number;
  balance: number;
  status: string;
}

interface InvoiceDisplay {
  summary: {
    totalInvoices: number;
    totalAmount: number;
    customerName: string;
  };
  invoices: FormattedInvoice[];
}

interface LineItem {
  Description?: string;
  Amount: number;
  Qty?: number;
  UnitAmount?: number;
}

interface InvoiceDetails {
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerId: string;
  amount: number;
  balance: number;
  status: string;
  lineItems?: Array<{
    description: string;
    amount: number;
    quantity: number;
    unitPrice: number;
  }>;
  dueDate?: string;
  terms?: string;
  notes?: string;
}

interface TimeOrderedInvoicesResponse {
  message?: string;
  error?: string;
  invoices: Invoice[];
  order: 'latest' | 'earliest';
  limit: number;
}

interface StatusInvoicesResponse {
  message?: string;
  error?: string;
  invoices: Invoice[];
  status: 'Paid' | 'Overdue' | 'Deposited';
  count: number;
  totalAmount: number;
}

interface ComplexInvoiceResponse {
  message?: string;
  error?: string;
  invoices: Invoice[];
  customerName: string;
  status: 'Paid' | 'Overdue' | 'Deposited' | 'All';
  count: number;
  totalAmount: number;
  steps: {
    customerFilter: string;
    statusFilter: string;
  };
}

interface Customer {
  Id: string;
  DisplayName: string;
}

interface InvoiceAnalysisResponse {
  message?: string;
  error?: string;
  customerName: string;
  analysis: {
    totalInvoices: number;
    totalAmount: number;
    paidInvoices: number;
    overdueInvoices: number;
    depositedInvoices: number;
    averagePaymentTime?: number;
    paymentTrend: 'Improving' | 'Declining' | 'Stable';
    recentStatus: string;
  };
  steps: Array<{
    step: number;
    description: string;
    status: 'completed' | 'failed' | 'skipped';
    details?: string;
  }>;
}

interface InvestigationStep {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  toolResult?: string;
}

interface InvoiceInvestigationResponse {
  message?: string;
  error?: string;
  steps: InvestigationStep[];
  conclusion: string;
}

// Tool to count invoices from QuickBooks API
const countInvoicesTool = tool({
  description: "Count the total number of invoices from the QuickBooks API",
  parameters: z.object({}),
  execute: async () => {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        return 'Sorry, I cannot access the invoices because the QuickBooks connection is not authenticated.';
      }

      const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: 'SELECT COUNT(*) FROM Invoice'
      });

      if (!response.ok) {
        console.error('Error fetching invoice count:', await response.text());
        return 'Sorry, I encountered an error while counting the invoices. Please try again.';
      }

      const data = await response.json();
      const count = data.QueryResponse?.totalCount || 0;
      
      if (count === 0) {
        return 'There are currently no invoices in the system.';
      }
      
      return `There are ${count} invoices in the system.`;
    } catch (error) {
      console.error('Error counting invoices:', error);
      return 'Sorry, I encountered an error while counting the invoices. Please try again.';
    }
  },
});

// Tool to fetch invoices for a specific customer
const getCustomerInvoicesTool = tool({
  description: "Fetch invoices for a specific customer from the QuickBooks API",
  parameters: z.object({
    customerName: z.string().describe("The name of the customer to fetch invoices for")
  }),
  execute: async ({ customerName }): Promise<string> => {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        return JSON.stringify({
          error: 'Sorry, I cannot access the invoices because the QuickBooks connection is not authenticated.',
          invoices: []
        } as CustomerInvoicesResponse);
      }

      // First, find the customer ID
      const customerResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Customer WHERE DisplayName LIKE '%${customerName}%'`
      });

      if (!customerResponse.ok) {
        console.error('Error fetching customer:', await customerResponse.text());
        return JSON.stringify({
          error: 'Sorry, I encountered an error while searching for the customer. Please try again.',
          invoices: []
        } as CustomerInvoicesResponse);
      }

      const customerData = await customerResponse.json();
      const customers = customerData.QueryResponse?.Customer || [];

      if (customers.length === 0) {
        return JSON.stringify({
          error: `No customer found with name containing "${customerName}".`,
          invoices: []
        } as CustomerInvoicesResponse);
      }

      // Get invoices for each matching customer
      const allInvoices: Invoice[] = [];
      for (const customer of customers) {
        const invoiceResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/text'
          },
          body: `SELECT * FROM Invoice WHERE CustomerRef = '${customer.Id}' ORDER BY TxnDate DESC`
        });

        if (!invoiceResponse.ok) {
          console.error('Error fetching invoices for customer:', await invoiceResponse.text());
          continue;
        }

        const invoiceData = await invoiceResponse.json();
        const customerInvoices = invoiceData.QueryResponse?.Invoice || [];
        allInvoices.push(...customerInvoices.map((invoice: Invoice) => ({
          ...invoice,
          customerName: customer.DisplayName // Add customer name to each invoice
        })));
      }

      if (allInvoices.length === 0) {
        return JSON.stringify({
          message: `No invoices found for customer(s) matching "${customerName}".`,
          invoices: []
        } as CustomerInvoicesResponse);
      }

      return JSON.stringify({
        message: `Found ${allInvoices.length} invoice(s) for customer(s) matching "${customerName}".`,
        invoices: allInvoices
      } as CustomerInvoicesResponse);
    } catch (error) {
      console.error('Error fetching customer invoices:', error);
      return JSON.stringify({
        error: 'Sorry, I encountered an error while fetching the invoices. Please try again.',
        invoices: []
      } as CustomerInvoicesResponse);
    }
  },
});

// Tool to fetch specific invoice details
const getInvoiceDetailsTool = tool({
  description: "Fetch detailed information about a specific invoice by its number",
  parameters: z.object({
    invoiceNumber: z.string().describe("The invoice number to fetch details for")
  }),
  execute: async ({ invoiceNumber }): Promise<string> => {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        return JSON.stringify({
          error: 'Sorry, I cannot access the invoice because the QuickBooks connection is not authenticated.',
          invoice: null
        });
      }

      // Query for the specific invoice
      const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Invoice WHERE DocNumber = '${invoiceNumber}'`
      });

      if (!response.ok) {
        console.error('Error fetching invoice:', await response.text());
        return JSON.stringify({
          error: 'Sorry, I encountered an error while fetching the invoice details. Please try again.',
          invoice: null
        });
      }

      const data = await response.json();
      const invoices = data.QueryResponse?.Invoice || [];

      if (invoices.length === 0) {
        return JSON.stringify({
          error: `No invoice found with number ${invoiceNumber}.`,
          invoice: null
        });
      }

      const invoice = invoices[0];

      // Get customer details
      const customerResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Customer WHERE Id = '${invoice.CustomerRef.value}'`
      });

      const customerData = await customerResponse.json();
      const customer = customerData.QueryResponse?.Customer?.[0];

      // Format the invoice details
      const formattedInvoice: InvoiceDetails = {
        invoiceNumber: invoice.DocNumber,
        date: new Date(invoice.TxnDate).toLocaleDateString('en-US'),
        customerName: customer?.DisplayName || 'Unknown Customer',
        customerId: invoice.CustomerRef.value,
        amount: invoice.TotalAmt,
        balance: invoice.Balance,
        status: invoice.Balance === 0 ? 'Paid' : 
               invoice.Balance < invoice.TotalAmt ? 'Partially Paid' : 'Unpaid',
        lineItems: invoice.Line?.map((line: LineItem) => ({
          description: line.Description || 'No description',
          amount: line.Amount,
          quantity: line.Qty || 1,
          unitPrice: line.UnitAmount || line.Amount
        })),
        dueDate: invoice.DueDate ? new Date(invoice.DueDate).toLocaleDateString('en-US') : undefined,
        terms: invoice.CustomerMemo?.value,
        notes: invoice.PrivateNote
      };

      return JSON.stringify({
        message: `Found invoice #${invoiceNumber}`,
        invoice: formattedInvoice
      });
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      return JSON.stringify({
        error: 'Sorry, I encountered an error while fetching the invoice details. Please try again.',
        invoice: null
      });
    }
  },
});

// Tool to fetch invoices ordered by time
const getTimeOrderedInvoicesTool = tool({
  description: "Fetch invoices ordered by time (latest or earliest) with a limit",
  parameters: z.object({
    order: z.enum(['latest', 'earliest']).describe("Whether to get latest or earliest invoices"),
    limit: z.number().min(1).max(50).describe("Number of invoices to fetch")
  }),
  execute: async ({ order, limit }): Promise<string> => {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        return JSON.stringify({
          error: 'Sorry, I cannot access the invoices because the QuickBooks connection is not authenticated.',
          invoices: [],
          order,
          limit
        } as TimeOrderedInvoicesResponse);
      }

      // Query invoices with time ordering
      const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Invoice ORDER BY TxnDate ${order === 'latest' ? 'DESC' : 'ASC'}`
      });

      if (!response.ok) {
        console.error('Error fetching invoices:', await response.text());
        return JSON.stringify({
          error: 'Sorry, I encountered an error while fetching the invoices. Please try again.',
          invoices: [],
          order,
          limit
        } as TimeOrderedInvoicesResponse);
      }

      const data = await response.json();
      const allInvoices = data.QueryResponse?.Invoice || [];

      if (allInvoices.length === 0) {
        return JSON.stringify({
          message: 'No invoices found in the system.',
          invoices: [],
          order,
          limit
        } as TimeOrderedInvoicesResponse);
      }

      // Filter invoices based on the limit
      const filteredInvoices = allInvoices.slice(0, limit);

      // Get customer names for each filtered invoice
      const invoicesWithCustomers = await Promise.all(filteredInvoices.map(async (invoice: Invoice) => {
        const customerResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/text'
          },
          body: `SELECT * FROM Customer WHERE Id = '${invoice.CustomerRef.value}'`
        });

        const customerData = await customerResponse.json();
        const customer = customerData.QueryResponse?.Customer?.[0];

        return {
          ...invoice,
          customerName: customer?.DisplayName || 'Unknown Customer'
        };
      }));

      return JSON.stringify({
        message: `Found ${invoicesWithCustomers.length} ${order} invoice(s)`,
        invoices: invoicesWithCustomers,
        order,
        limit
      } as TimeOrderedInvoicesResponse);
    } catch (error) {
      console.error('Error fetching time-ordered invoices:', error);
      return JSON.stringify({
        error: 'Sorry, I encountered an error while fetching the invoices. Please try again.',
        invoices: [],
        order,
        limit
      } as TimeOrderedInvoicesResponse);
    }
  },
});

// Tool to count invoices by status
const getInvoicesByStatusTool = tool({
  description: "Count invoices by their status (Paid, Overdue, or Deposited)",
  parameters: z.object({
    status: z.enum(['Paid', 'Overdue', 'Deposited']).describe("The status to count invoices for")
  }),
  execute: async ({ status }): Promise<string> => {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        return JSON.stringify({
          error: 'Sorry, I cannot access the invoices because the QuickBooks connection is not authenticated.',
          invoices: [],
          status,
          count: 0,
          totalAmount: 0
        } as StatusInvoicesResponse);
      }

      // Query all invoices
      const response = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: 'SELECT * FROM Invoice'
      });

      if (!response.ok) {
        console.error('Error fetching invoices:', await response.text());
        return JSON.stringify({
          error: 'Sorry, I encountered an error while fetching the invoices. Please try again.',
          invoices: [],
          status,
          count: 0,
          totalAmount: 0
        } as StatusInvoicesResponse);
      }

      const data = await response.json();
      const allInvoices = data.QueryResponse?.Invoice || [];

      if (allInvoices.length === 0) {
        return JSON.stringify({
          message: 'No invoices found in the system.',
          invoices: [],
          status,
          count: 0,
          totalAmount: 0
        } as StatusInvoicesResponse);
      }

      // Filter invoices by status
      const filteredInvoices = allInvoices.filter((invoice: Invoice) => {
        switch (status) {
          case 'Paid':
            return invoice.Balance === 0;
          case 'Overdue':
            return invoice.Balance > 0 && invoice.DueDate && new Date(invoice.DueDate) < new Date();
          case 'Deposited':
            return invoice.Deposit === 1;
          default:
            return false;
        }
      });

      const totalAmount = filteredInvoices.reduce((sum: number, inv: Invoice) => sum + inv.TotalAmt, 0);

      return JSON.stringify({
        message: `Found ${filteredInvoices.length} ${status.toLowerCase()} invoice(s)`,
        invoices: filteredInvoices,
        status,
        count: filteredInvoices.length,
        totalAmount
      } as StatusInvoicesResponse);
    } catch (error) {
      console.error('Error fetching invoices by status:', error);
      return JSON.stringify({
        error: 'Sorry, I encountered an error while fetching the invoices. Please try again.',
        invoices: [],
        status,
        count: 0,
        totalAmount: 0
      } as StatusInvoicesResponse);
    }
  },
});

// Tool for complex invoice operations
const getComplexInvoicesTool = tool({
  description: "Perform complex invoice operations combining multiple filters (customer and status)",
  parameters: z.object({
    customerName: z.string().describe("The name of the customer to filter invoices for"),
    status: z.enum(['Paid', 'Overdue', 'Deposited', 'All']).describe("The status to filter invoices by"),
    maxSteps: z.number().default(5).describe("Maximum number of steps to perform")
  }),
  execute: async ({ customerName, status }): Promise<string> => {
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        return JSON.stringify({
          error: 'Sorry, I cannot access the invoices because the QuickBooks connection is not authenticated.',
          invoices: [],
          customerName,
          status,
          count: 0,
          totalAmount: 0,
          steps: {
            customerFilter: 'Failed - Not authenticated',
            statusFilter: 'Not applied'
          }
        } as ComplexInvoiceResponse);
      }

      // Step 1: Find customer ID with exact name match
      const customerResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Customer WHERE DisplayName = '${customerName}'`
      });

      if (!customerResponse.ok) {
        return JSON.stringify({
          error: 'Error finding customer',
          invoices: [],
          customerName,
          status,
          count: 0,
          totalAmount: 0,
          steps: {
            customerFilter: 'Failed - Error finding customer',
            statusFilter: 'Not applied'
          }
        } as ComplexInvoiceResponse);
      }

      const customerData = await customerResponse.json();
      const customers = customerData.QueryResponse?.Customer || [];

      if (customers.length === 0) {
        // If exact match fails, try partial match
        const partialCustomerResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/text'
          },
          body: `SELECT * FROM Customer WHERE DisplayName LIKE '%${customerName}%'`
        });

        if (!partialCustomerResponse.ok) {
          return JSON.stringify({
            error: `No customer found with name "${customerName}"`,
            invoices: [],
            customerName,
            status,
            count: 0,
            totalAmount: 0,
            steps: {
              customerFilter: `Failed - No customer found matching "${customerName}"`,
              statusFilter: 'Not applied'
            }
          } as ComplexInvoiceResponse);
        }

        const partialCustomerData = await partialCustomerResponse.json();
        const partialCustomers = partialCustomerData.QueryResponse?.Customer || [];

        if (partialCustomers.length === 0) {
          return JSON.stringify({
            error: `No customer found with name containing "${customerName}"`,
            invoices: [],
            customerName,
            status,
            count: 0,
            totalAmount: 0,
            steps: {
              customerFilter: `Failed - No customer found matching "${customerName}"`,
              statusFilter: 'Not applied'
            }
          } as ComplexInvoiceResponse);
        }

        // Use partial match results
        customers.push(...partialCustomers);
      }

      // Step 2: Get invoices for each matching customer
      const allInvoices: Invoice[] = [];
      for (const customer of customers) {
        const invoiceResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/text'
          },
          body: `SELECT * FROM Invoice WHERE CustomerRef = '${customer.Id}' ORDER BY TxnDate DESC`
        });

        if (!invoiceResponse.ok) continue;

        const invoiceData = await invoiceResponse.json();
        const customerInvoices = invoiceData.QueryResponse?.Invoice || [];
        
        // Add customer name to each invoice
        const invoicesWithCustomer = customerInvoices.map((invoice: Invoice) => ({
          ...invoice,
          customerName: customer.DisplayName
        }));
        
        allInvoices.push(...invoicesWithCustomer);
      }

      // Step 3: Apply status filter if not 'All'
      const filteredInvoices = status === 'All' ? allInvoices : allInvoices.filter((invoice: Invoice) => {
        switch (status) {
          case 'Paid':
            return invoice.Balance === 0;
          case 'Overdue':
            return invoice.Balance > 0 && invoice.DueDate && new Date(invoice.DueDate) < new Date();
          case 'Deposited':
            return invoice.Deposit === 1;
          default:
            return true;
        }
      });

      const totalAmount = filteredInvoices.reduce((sum: number, inv: Invoice) => sum + inv.TotalAmt, 0);

      // Create a more detailed message based on the matching type
      const matchingType = customers.length === 1 && customers[0].DisplayName === customerName 
        ? 'exact match' 
        : 'partial match';
      const customerNames = [...new Set(customers.map((c: Customer) => c.DisplayName))].join(', ');

      return JSON.stringify({
        message: `Found ${filteredInvoices.length} ${status.toLowerCase()} invoice(s) for customer(s) "${customerNames}" (${matchingType})`,
        invoices: filteredInvoices,
        customerName: customerNames,
        status,
        count: filteredInvoices.length,
        totalAmount,
        steps: {
          customerFilter: `Success - Found ${customers.length} matching customer(s): ${customerNames}`,
          statusFilter: status === 'All' ? 'Not applied' : `Applied - Filtered by ${status} status`
        }
      } as ComplexInvoiceResponse);
    } catch (error) {
      console.error('Error in complex invoice operation:', error);
      return JSON.stringify({
        error: 'Sorry, I encountered an error while processing the complex invoice operation.',
        invoices: [],
        customerName,
        status,
        count: 0,
        totalAmount: 0,
        steps: {
          customerFilter: 'Failed - Error occurred',
          statusFilter: 'Not applied'
        }
      } as ComplexInvoiceResponse);
    }
  },
});

// Tool for multi-step invoice analysis
const analyzeCustomerInvoicesTool = tool({
  description: "Perform a detailed analysis of a customer's invoice history with step-by-step logging",
  parameters: z.object({
    customerName: z.string().describe("The name of the customer to analyze"),
    maxSteps: z.number().min(1).max(5).describe("Maximum number of analysis steps to perform")
  }),
  execute: async ({ customerName, maxSteps }): Promise<string> => {
    const steps: Array<{ step: number; description: string; status: 'completed' | 'failed' | 'skipped'; details?: string }> = [];
    let currentStep = 0;

    const logStep = (description: string, status: 'completed' | 'failed' | 'skipped', details?: string) => {
      currentStep++;
      if (currentStep <= maxSteps) {
        const step = { step: currentStep, description, status, details };
        steps.push(step);
        console.log(`\nStep ${currentStep}/${maxSteps}: ${description}`);
        console.log(`Status: ${status}`);
        if (details) console.log(`Details: ${details}`);
        console.log('----------------------------------------');
      }
    };

    try {
      // Step 1: Authentication Check
      logStep('Checking authentication', 'completed', 'Verifying QuickBooks access');
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('qb_access_token')?.value;
      const realmId = cookieStore.get('qb_realm_id')?.value;

      if (!accessToken || !realmId) {
        logStep('Authentication check', 'failed', 'QuickBooks connection not authenticated');
        return JSON.stringify({
          error: 'Sorry, I cannot access the invoices because the QuickBooks connection is not authenticated.',
          customerName,
          analysis: {
            totalInvoices: 0,
            totalAmount: 0,
            paidInvoices: 0,
            overdueInvoices: 0,
            depositedInvoices: 0,
            paymentTrend: 'Stable',
            recentStatus: 'N/A'
          },
          steps
        } as InvoiceAnalysisResponse);
      }

      // Step 2: Find Customer
      logStep('Finding customer', 'completed', `Searching for customer: ${customerName}`);
      const customerResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Customer WHERE DisplayName = '${customerName}'`
      });

      if (!customerResponse.ok) {
        logStep('Customer search', 'failed', 'Error finding customer');
        return JSON.stringify({
          error: 'Error finding customer',
          customerName,
          analysis: {
            totalInvoices: 0,
            totalAmount: 0,
            paidInvoices: 0,
            overdueInvoices: 0,
            depositedInvoices: 0,
            paymentTrend: 'Stable',
            recentStatus: 'N/A'
          },
          steps
        } as InvoiceAnalysisResponse);
      }

      const customerData = await customerResponse.json();
      const customers = customerData.QueryResponse?.Customer || [];

      if (customers.length === 0) {
        logStep('Customer search', 'failed', `No customer found with name: ${customerName}`);
        return JSON.stringify({
          error: `No customer found with name "${customerName}"`,
          customerName,
          analysis: {
            totalInvoices: 0,
            totalAmount: 0,
            paidInvoices: 0,
            overdueInvoices: 0,
            depositedInvoices: 0,
            paymentTrend: 'Stable',
            recentStatus: 'N/A'
          },
          steps
        } as InvoiceAnalysisResponse);
      }

      // Step 3: Fetch Invoices
      logStep('Fetching invoices', 'completed', 'Retrieving customer invoices');
      const customer = customers[0];
      const invoiceResponse = await fetch(`https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/text'
        },
        body: `SELECT * FROM Invoice WHERE CustomerRef = '${customer.Id}' ORDER BY TxnDate DESC`
      });

      if (!invoiceResponse.ok) {
        logStep('Invoice fetch', 'failed', 'Error fetching invoices');
        return JSON.stringify({
          error: 'Error fetching invoices',
          customerName,
          analysis: {
            totalInvoices: 0,
            totalAmount: 0,
            paidInvoices: 0,
            overdueInvoices: 0,
            depositedInvoices: 0,
            paymentTrend: 'Stable',
            recentStatus: 'N/A'
          },
          steps
        } as InvoiceAnalysisResponse);
      }

      const invoiceData = await invoiceResponse.json();
      const invoices = invoiceData.QueryResponse?.Invoice || [];

      // Step 4: Analyze Invoices
      if (currentStep < maxSteps) {
        logStep('Analyzing invoices', 'completed', `Processing ${invoices.length} invoices`);
        
        const analysis: {
          totalInvoices: number;
          totalAmount: number;
          paidInvoices: number;
          overdueInvoices: number;
          depositedInvoices: number;
          averagePaymentTime?: number;
          paymentTrend: 'Improving' | 'Declining' | 'Stable';
          recentStatus: string;
        } = {
          totalInvoices: invoices.length,
          totalAmount: invoices.reduce((sum: number, inv: Invoice) => sum + inv.TotalAmt, 0),
          paidInvoices: invoices.filter((inv: Invoice) => inv.Balance === 0).length,
          overdueInvoices: invoices.filter((inv: Invoice) => 
            inv.Balance > 0 && inv.DueDate && new Date(inv.DueDate) < new Date()
          ).length,
          depositedInvoices: invoices.filter((inv: Invoice) => inv.Deposit === 1).length,
          paymentTrend: 'Stable',
          recentStatus: 'N/A'
        };

        // Calculate payment trend based on last 3 invoices
        if (invoices.length >= 3) {
          const recentInvoices = invoices.slice(0, 3);
          const paidCount = recentInvoices.filter((inv: Invoice) => inv.Balance === 0).length;
          analysis.paymentTrend = paidCount === 3 ? 'Improving' : 
                                paidCount === 0 ? 'Declining' : 'Stable';
          analysis.recentStatus = `Last 3 invoices: ${paidCount} paid`;
        }

        // Step 5: Calculate Average Payment Time (if we have enough steps)
        if (currentStep < maxSteps) {
          logStep('Calculating payment metrics', 'completed', 'Computing average payment time');
          
          const paidInvoices = invoices.filter((inv: Invoice) => inv.Balance === 0);
          if (paidInvoices.length > 0) {
            const totalDays = paidInvoices.reduce((sum: number, inv: Invoice) => {
              const invoiceDate = new Date(inv.TxnDate);
              const paidDate = new Date(inv.MetaData?.LastUpdatedTime || inv.TxnDate);
              return sum + Math.floor((paidDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
            }, 0);
            analysis.averagePaymentTime = Math.round(totalDays / paidInvoices.length);
          }
        } else {
          logStep('Calculating payment metrics', 'skipped', 'Step limit reached');
        }

        return JSON.stringify({
          message: `Analysis completed for ${customerName}`,
          customerName,
          analysis,
          steps
        } as InvoiceAnalysisResponse);
      } else {
        logStep('Invoice analysis', 'skipped', 'Step limit reached');
        return JSON.stringify({
          error: 'Analysis incomplete due to step limit',
          customerName,
          analysis: {
            totalInvoices: invoices.length,
            totalAmount: invoices.reduce((sum: number, inv: Invoice) => sum + inv.TotalAmt, 0),
            paidInvoices: 0,
            overdueInvoices: 0,
            depositedInvoices: 0,
            paymentTrend: 'Stable',
            recentStatus: 'N/A'
          },
          steps
        } as InvoiceAnalysisResponse);
      }
    } catch (error) {
      console.error('Error in invoice analysis:', error);
      logStep('Error handling', 'failed', 'Unexpected error occurred');
      return JSON.stringify({
        error: 'Sorry, I encountered an error while analyzing the invoices.',
        customerName,
        analysis: {
          totalInvoices: 0,
          totalAmount: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
          depositedInvoices: 0,
          paymentTrend: 'Stable',
          recentStatus: 'N/A'
        },
        steps
      } as InvoiceAnalysisResponse);
    }
  },
});

// Tool for multi-step invoice investigation
const investigateInvoicesTool = tool({
  description: "Perform a multi-step investigation of invoices with LLM-guided analysis",
  parameters: z.object({
    query: z.string().describe("The initial query or observation to investigate"),
    maxSteps: z.number().min(1).max(5).describe("Maximum number of investigation steps")
  }),
  execute: async ({ query, maxSteps }): Promise<string> => {
    const steps: InvestigationStep[] = [];

    const addStep = (step: InvestigationStep) => {
      steps.push(step);
      console.log(`\nStep ${steps.length}/${maxSteps}:`);
      console.log(`Role: ${step.role}`);
      if (step.toolName) console.log(`Tool: ${step.toolName}`);
      console.log(`Content: ${step.content}`);
      if (step.toolResult) console.log(`Tool Result: ${step.toolResult}`);
      console.log('----------------------------------------');
    };

    try {
      // Initial user query
      addStep({ role: 'user', content: query });

      // Step 1: LLM analyzes the query and decides first action
      const initialAnalysis = await generateText({
        model: openai('gpt-4'),
        system: `You are an invoice investigation assistant. Analyze the user's query and decide the first step of investigation.
                Available tools: countInvoicesTool, getCustomerInvoicesTool, getInvoiceDetailsTool, getTimeOrderedInvoicesTool, getInvoicesByStatusTool.
                Respond with a JSON object containing:
                {
                  "thought": "Your reasoning about the query",
                  "action": "Which tool to use",
                  "parameters": {tool specific parameters}
                }`,
        prompt: `Analyze this query and determine the first investigation step: ${query}`
      });

      addStep({ 
        role: 'assistant', 
        content: `Initial analysis: ${initialAnalysis.text}` 
      });

      // Parse LLM's decision
      const decision = JSON.parse(initialAnalysis.text);
      addStep({ 
        role: 'tool', 
        content: `Decided to use ${decision.action}`,
        toolName: decision.action
      });

      // Step 2: Execute the first tool
      let toolResult;
      switch (decision.action) {
        case 'countInvoicesTool':
          toolResult = await countInvoicesTool.execute({});
          break;
        case 'getCustomerInvoicesTool':
          toolResult = await getCustomerInvoicesTool.execute({ customerName: decision.parameters.customerName });
          break;
        case 'getInvoiceDetailsTool':
          toolResult = await getInvoiceDetailsTool.execute({ invoiceNumber: decision.parameters.invoiceNumber });
          break;
        case 'getTimeOrderedInvoicesTool':
          toolResult = await getTimeOrderedInvoicesTool.execute(decision.parameters);
          break;
        case 'getInvoicesByStatusTool':
          toolResult = await getInvoicesByStatusTool.execute({ status: decision.parameters.status });
          break;
        default:
          throw new Error(`Unknown tool: ${decision.action}`);
      }

      addStep({ 
        role: 'tool', 
        content: 'Tool execution completed',
        toolName: decision.action,
        toolResult: toolResult
      });

      // Step 3: LLM analyzes the tool result and decides next action
      const resultAnalysis = await generateText({
        model: openai('gpt-4'),
        system: `You are an invoice investigation assistant. Analyze the invoice data and provide a clear, structured analysis.
                Focus on payment patterns, amounts, and status.
                Your response MUST be a JSON object in this format:
                {
                  "thought": "Your analysis of the payment patterns",
                  "conclusion": "A clear summary of findings",
                  "details": {
                    "totalInvoices": number,
                    "totalAmount": number,
                    "paidAmount": number,
                    "outstandingAmount": number,
                    "paymentStatus": "Good/Fair/Poor",
                    "paymentTrend": "Improving/Stable/Declining",
                    "averagePaymentTime": number,
                    "recentActivity": "Description of recent payment behavior"
                  }
                }`,
        prompt: `Analyze this invoice data for payment patterns and provide a clear summary: ${JSON.stringify(toolResult)}`
      });

      // Parse and format the conclusion
      let conclusion;
      try {
        const jsonMatch = resultAnalysis.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          conclusion = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, analyze the raw data
          const data = JSON.parse(toolResult);
          const invoices = data.invoices || [];
          const totalAmount = invoices.reduce((sum: number, inv: Invoice) => sum + inv.TotalAmt, 0);
          const paidAmount = invoices.reduce((sum: number, inv: Invoice) => sum + (inv.TotalAmt - inv.Balance), 0);
          const outstandingAmount = invoices.reduce((sum: number, inv: Invoice) => sum + inv.Balance, 0);
          
          conclusion = {
            thought: "Analyzing payment patterns from invoice data",
            conclusion: `Found ${invoices.length} invoices with total amount of $${totalAmount.toFixed(2)}`,
            details: {
              totalInvoices: invoices.length,
              totalAmount,
              paidAmount,
              outstandingAmount,
              paymentStatus: outstandingAmount === 0 ? "Good" : outstandingAmount < totalAmount * 0.5 ? "Fair" : "Poor",
              paymentTrend: "Stable",
              recentActivity: "Based on available invoice data"
            }
          };
        }
      } catch (error) {
        console.error(`Error parsing LLM response: ${resultAnalysis.text}`);
        conclusion = {
          thought: "Error analyzing payment data",
          conclusion: "Unable to provide detailed analysis",
          details: {
            totalInvoices: 0,
            totalAmount: 0,
            paidAmount: 0,
            outstandingAmount: 0,
            paymentStatus: "Unknown",
            paymentTrend: "Unknown",
            recentActivity: "Analysis failed"
          }
        };
      }

      // Format the final response
      const formattedResponse = {
        role: 'assistant',
        content: `Payment History Analysis for John Melton:\n\n` +
                `Total Invoices: ${conclusion.details.totalInvoices}\n` +
                `Total Amount: $${conclusion.details.totalAmount.toFixed(2)}\n` +
                `Paid Amount: $${conclusion.details.paidAmount.toFixed(2)}\n` +
                `Outstanding Amount: $${conclusion.details.outstandingAmount.toFixed(2)}\n` +
                `Payment Status: ${conclusion.details.paymentStatus}\n` +
                `Payment Trend: ${conclusion.details.paymentTrend}\n` +
                `Recent Activity: ${conclusion.details.recentActivity}\n\n` +
                `Detailed Invoice List:\n` +
                JSON.parse(toolResult).invoices.map((inv: Invoice) => 
                  `Invoice #${inv.DocNumber}\n` +
                  `Date: ${new Date(inv.TxnDate).toLocaleDateString()}\n` +
                  `Amount: $${inv.TotalAmt.toFixed(2)}\n` +
                  `Balance: $${inv.Balance.toFixed(2)}\n` +
                  `Status: ${inv.Balance === 0 ? 'Paid' : inv.Balance < inv.TotalAmt ? 'Partially Paid' : 'Unpaid'}\n` +
                  `Due Date: ${inv.DueDate ? new Date(inv.DueDate).toLocaleDateString() : 'Not specified'}\n`
                ).join('\n'),
        structuredData: {
          summary: {
            totalInvoices: conclusion.details.totalInvoices,
            totalAmount: conclusion.details.totalAmount,
            paidAmount: conclusion.details.paidAmount,
            outstandingAmount: conclusion.details.outstandingAmount,
            paymentStatus: conclusion.details.paymentStatus,
            paymentTrend: conclusion.details.paymentTrend,
            recentActivity: conclusion.details.recentActivity
          },
          invoices: JSON.parse(toolResult).invoices.map((inv: Invoice) => ({
            invoiceNumber: inv.DocNumber,
            date: new Date(inv.TxnDate).toLocaleDateString(),
            amount: inv.TotalAmt,
            balance: inv.Balance,
            status: inv.Balance === 0 ? 'Paid' : inv.Balance < inv.TotalAmt ? 'Partially Paid' : 'Unpaid',
            dueDate: inv.DueDate ? new Date(inv.DueDate).toLocaleDateString() : 'Not specified'
          }))
        }
      };

      return JSON.stringify(formattedResponse);

    } catch (error: unknown) {
      console.error('Error in invoice investigation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addStep({ 
        role: 'assistant', 
        content: `Error occurred: ${errorMessage}` 
      });
      
      return JSON.stringify({
        error: 'Sorry, I encountered an error during the investigation.',
        steps,
        conclusion: 'Investigation failed due to an error'
      } as InvoiceInvestigationResponse);
    }
  },
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];

    // Check for time-ordered invoice queries
    const timeOrderMatch = lastMessage.content.match(/(latest|earliest) (\d+) invoices/i);
    if (timeOrderMatch) {
      const [, order, limitStr] = timeOrderMatch;
      const limit = parseInt(limitStr, 10);
      
      if (isNaN(limit) || limit < 1 || limit > 50) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: 'Please specify a valid number of invoices between 1 and 50.'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const resultStr = await getTimeOrderedInvoicesTool.execute({ 
        order: order.toLowerCase() as 'latest' | 'earliest',
        limit 
      });
      const result = JSON.parse(resultStr) as TimeOrderedInvoicesResponse;

      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format the invoices for display
      const formattedInvoices: InvoiceDisplay = {
        summary: {
          totalInvoices: result.invoices.length,
          totalAmount: result.invoices.reduce((sum, inv) => sum + inv.TotalAmt, 0),
          customerName: `${order} ${limit} Invoices`
        },
        invoices: result.invoices.map(inv => ({
          invoiceNumber: inv.DocNumber,
          date: new Date(inv.TxnDate).toLocaleDateString('en-US'),
          amount: inv.TotalAmt,
          balance: inv.Balance,
          status: inv.Balance === 0 ? 'Paid' : 
                 inv.Balance < inv.TotalAmt ? 'Partially Paid' : 'Unpaid'
        }))
      };

      const content = `${result.message}\n\n` +
        `Total Amount: $${formattedInvoices.summary.totalAmount.toFixed(2)}\n\n` +
        `Invoices:\n${formattedInvoices.invoices.map((inv: FormattedInvoice) => 
          `Invoice #${inv.invoiceNumber}\n` +
          `Date: ${inv.date}\n` +
          `Customer: ${result.invoices.find(i => i.DocNumber === inv.invoiceNumber)?.customerName}\n` +
          `Amount: $${inv.amount.toFixed(2)}\n` +
          `Balance: $${inv.balance.toFixed(2)}\n` +
          `Status: ${inv.status}\n`
        ).join('\n')}`;

      return new Response(JSON.stringify({
        role: 'assistant',
        content,
        structuredData: formattedInvoices
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for status-based invoice queries
    const statusMatch = lastMessage.content.match(/(?:how many|count|get|show|list) (paid|overdue|deposited) invoices/i);
    if (statusMatch) {
      const status = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1) as 'Paid' | 'Overdue' | 'Deposited';
      
      const resultStr = await getInvoicesByStatusTool.execute({ status });
      const result = JSON.parse(resultStr) as StatusInvoicesResponse;

      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format the response
      const content = `${result.message}\n\n` +
        `Total Amount: $${result.totalAmount.toFixed(2)}\n\n` +
        `Invoices:\n${result.invoices.map((inv: Invoice) => 
          `Invoice #${inv.DocNumber}\n` +
          `Date: ${new Date(inv.TxnDate).toLocaleDateString('en-US')}\n` +
          `Amount: $${inv.TotalAmt.toFixed(2)}\n` +
          `Balance: $${inv.Balance.toFixed(2)}\n` +
          `Due Date: ${inv.DueDate ? new Date(inv.DueDate).toLocaleDateString('en-US') : 'N/A'}\n`
        ).join('\n')}`;

      return new Response(JSON.stringify({
        role: 'assistant',
        content,
        structuredData: {
          summary: {
            status,
            count: result.count,
            totalAmount: result.totalAmount
          },
          invoices: result.invoices.map(inv => ({
            invoiceNumber: inv.DocNumber,
            date: new Date(inv.TxnDate).toLocaleDateString('en-US'),
            amount: inv.TotalAmt,
            balance: inv.Balance,
            dueDate: inv.DueDate ? new Date(inv.DueDate).toLocaleDateString('en-US') : 'N/A'
          }))
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for invoice number query
    const invoiceNumberMatch = lastMessage.content.match(/show invoice (?:number )?(\d+)|get invoice (?:number )?(\d+)|invoice (?:number )?(\d+)/i);
    const invoiceNumber = invoiceNumberMatch ? (invoiceNumberMatch[1] || invoiceNumberMatch[2] || invoiceNumberMatch[3]) : null;

    if (invoiceNumber) {
      // For specific invoice queries, use the invoice details tool
      const resultStr = await getInvoiceDetailsTool.execute({ invoiceNumber });
      const result = JSON.parse(resultStr);
      
      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const invoice = result.invoice;
      const lineItemsText = invoice.lineItems?.map((item: { description: string; quantity: number; unitPrice: number; amount: number }) => 
        `- ${item.description}\n  Quantity: ${item.quantity}\n  Unit Price: $${item.unitPrice.toFixed(2)}\n  Amount: $${item.amount.toFixed(2)}`
      ).join('\n\n') || 'No line items';

      const content = `Invoice #${invoice.invoiceNumber}\n\n` +
        `Date: ${invoice.date}\n` +
        `Customer: ${invoice.customerName}\n` +
        `Amount: $${invoice.amount.toFixed(2)}\n` +
        `Balance: $${invoice.balance.toFixed(2)}\n` +
        `Status: ${invoice.status}\n` +
        (invoice.dueDate ? `Due Date: ${invoice.dueDate}\n` : '') +
        (invoice.terms ? `Terms: ${invoice.terms}\n` : '') +
        (invoice.notes ? `Notes: ${invoice.notes}\n` : '') +
        `\nLine Items:\n${lineItemsText}`;

      return new Response(JSON.stringify({
        role: 'assistant',
        content,
        structuredData: invoice // Include structured data for UI rendering
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if the message is asking about invoice count
    const isAskingAboutCount = /how many invoices|total invoices|count invoices|number of invoices/i.test(lastMessage.content);

    // Check if the message is asking about customer invoices
    const customerInvoiceMatch = lastMessage.content.match(/get me invoices for (.+)|show invoices for (.+)|list invoices for (.+)/i);
    const customerName = customerInvoiceMatch ? (customerInvoiceMatch[1] || customerInvoiceMatch[2] || customerInvoiceMatch[3]) : null;

    if (customerName) {
      // For customer invoice queries, use the customer invoices tool
      const resultStr = await getCustomerInvoicesTool.execute({ customerName });
      const result = JSON.parse(resultStr) as CustomerInvoicesResponse;
      
      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format the invoices manually
      const formattedInvoices: InvoiceDisplay = {
        summary: {
          totalInvoices: result.invoices.length,
          totalAmount: result.invoices.reduce((sum, inv) => sum + inv.TotalAmt, 0),
          customerName: customerName
        },
        invoices: result.invoices.map(inv => ({
          invoiceNumber: inv.DocNumber,
          date: new Date(inv.TxnDate).toLocaleDateString('en-US'),
          amount: inv.TotalAmt,
          balance: inv.Balance,
          status: inv.Balance === 0 ? 'Paid' : 
                 inv.Balance < inv.TotalAmt ? 'Partially Paid' : 'Unpaid'
        }))
      };

      return new Response(JSON.stringify({
        role: 'assistant',
        content: `Found ${formattedInvoices.summary.totalInvoices} invoice(s) for ${formattedInvoices.summary.customerName}.\n\nTotal Amount: $${formattedInvoices.summary.totalAmount.toFixed(2)}\n\nInvoices:\n${formattedInvoices.invoices.map((inv: FormattedInvoice) => 
          `Invoice #${inv.invoiceNumber}\nDate: ${inv.date}\nAmount: $${inv.amount.toFixed(2)}\nBalance: $${inv.balance.toFixed(2)}\nStatus: ${inv.status}\n`
        ).join('\n')}`,
        structuredData: formattedInvoices // Include structured data for UI rendering
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (isAskingAboutCount) {
      // For invoice count queries, directly use the tool
      const result = await countInvoicesTool.execute({});
      return new Response(JSON.stringify({
        role: 'assistant',
        content: result
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for complex invoice operations
    const complexMatch = lastMessage.content.match(/(?:show|get|list) (paid|overdue|deposited|all) invoices for (.+)/i);
    if (complexMatch) {
      const [, status, customerName] = complexMatch;
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1) as 'Paid' | 'Overdue' | 'Deposited' | 'All';
      
      const resultStr = await getComplexInvoicesTool.execute({ 
        customerName, 
        status: formattedStatus,
        maxSteps: 5
      });
      const result = JSON.parse(resultStr) as ComplexInvoiceResponse;

      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format the response
      const content = `${result.message}\n\n` +
        `Operation Steps:\n` +
        `1. Customer Filter: ${result.steps.customerFilter}\n` +
        `2. Status Filter: ${result.steps.statusFilter}\n\n` +
        `Total Amount: $${result.totalAmount.toFixed(2)}\n\n` +
        `Invoices:\n${result.invoices.map((inv: Invoice) => 
          `Invoice #${inv.DocNumber}\n` +
          `Date: ${new Date(inv.TxnDate).toLocaleDateString('en-US')}\n` +
          `Customer: ${inv.customerName}\n` +
          `Amount: $${inv.TotalAmt.toFixed(2)}\n` +
          `Balance: $${inv.Balance.toFixed(2)}\n` +
          `Due Date: ${inv.DueDate ? new Date(inv.DueDate).toLocaleDateString('en-US') : 'N/A'}\n`
        ).join('\n')}`;

      return new Response(JSON.stringify({
        role: 'assistant',
        content,
        structuredData: {
          summary: {
            customerName: result.customerName,
            status: result.status,
            count: result.count,
            totalAmount: result.totalAmount,
            steps: result.steps
          },
          invoices: result.invoices.map(inv => ({
            invoiceNumber: inv.DocNumber,
            date: new Date(inv.TxnDate).toLocaleDateString('en-US'),
            customerName: inv.customerName,
            amount: inv.TotalAmt,
            balance: inv.Balance,
            dueDate: inv.DueDate ? new Date(inv.DueDate).toLocaleDateString('en-US') : 'N/A'
          }))
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for invoice analysis queries
    const analysisMatch = lastMessage.content.match(/(?:analyze|analyze invoices|get analysis) for (.+)/i);
    if (analysisMatch) {
      const customerName = analysisMatch[1];
      
      const resultStr = await analyzeCustomerInvoicesTool.execute({ 
        customerName,
        maxSteps: 5
      });
      const result = JSON.parse(resultStr) as InvoiceAnalysisResponse;

      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Format the response
      const content = `${result.message}\n\n` +
        `Analysis Steps:\n${result.steps.map(step => 
          `Step ${step.step}: ${step.description}\n` +
          `Status: ${step.status}\n` +
          (step.details ? `Details: ${step.details}\n` : '')
        ).join('\n')}\n\n` +
        `Analysis Results:\n` +
        `Total Invoices: ${result.analysis.totalInvoices}\n` +
        `Total Amount: $${result.analysis.totalAmount.toFixed(2)}\n` +
        `Paid Invoices: ${result.analysis.paidInvoices}\n` +
        `Overdue Invoices: ${result.analysis.overdueInvoices}\n` +
        `Deposited Invoices: ${result.analysis.depositedInvoices}\n` +
        (result.analysis.averagePaymentTime ? 
          `Average Payment Time: ${result.analysis.averagePaymentTime} days\n` : '') +
        `Payment Trend: ${result.analysis.paymentTrend}\n` +
        `Recent Status: ${result.analysis.recentStatus}`;

      return new Response(JSON.stringify({
        role: 'assistant',
        content,
        structuredData: {
          customerName: result.customerName,
          analysis: result.analysis,
          steps: result.steps
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for investigation queries
    const investigationMatch = lastMessage.content.match(/(?:investigate|look into|analyze in detail) (.+)/i);
    if (investigationMatch) {
      const query = investigationMatch[1];
      
      const resultStr = await investigateInvoicesTool.execute({ 
        query,
        maxSteps: 5
      });
      const result = JSON.parse(resultStr);

      if (result.error) {
        return new Response(JSON.stringify({
          role: 'assistant',
          content: result.error
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Return the formatted response directly
      return new Response(JSON.stringify({
        role: 'assistant',
        content: result.content,
        structuredData: result.structuredData
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For other messages, use the regular chat flow
    const { text } = await generateText({
      model: openai('gpt-4'),
      system: `You are a helpful AI assistant for an invoice management application. 
              You can help users with invoice-related queries and general assistance.
              When asked about the number of invoices, suggest using the count feature.
              When asked about invoices for a specific customer, use the customer invoices feature.`,
      prompt: lastMessage.content,
    });

    return new Response(JSON.stringify({
      role: 'assistant',
      content: text
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 