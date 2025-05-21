import { create } from 'zustand';

export interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  CustomerRef: {
    name: string;
  };
  TotalAmt: number;
  Balance: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

interface ToolResult {
  type: 'success' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

interface InvoiceStore {
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[]) => void;
  toolResult: ToolResult | null;
  setToolResult: (result: ToolResult | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useInvoiceStore = create<InvoiceStore>()((set) => ({
  invoices: [],
  setInvoices: (invoices: Invoice[]) => set({ invoices }),
  toolResult: null,
  setToolResult: (result: ToolResult | null) => set({ toolResult: result }),
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
})); 