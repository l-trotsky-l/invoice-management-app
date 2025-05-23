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