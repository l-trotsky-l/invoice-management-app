'use client';

import { useInvoiceStore, Invoice } from '../app/store/invoiceStore';

interface ToolResultData {
  count?: number;
  amount?: number;
  invoices?: Invoice[];
}

export default function ToolResultDisplay() {
  const { toolResult, isLoading } = useInvoiceStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!toolResult) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Ask me about your invoices
      </div>
    );
  }

  const data = toolResult.data as ToolResultData | undefined;

  return (
    <div className="p-6">
      <div className={`p-4 rounded-lg ${
        toolResult.type === 'success' 
          ? 'bg-green-500/10 border border-green-500/20' 
          : 'bg-red-500/10 border border-red-500/20'
      }`}>
        <p className={`text-lg font-medium ${
          toolResult.type === 'success' ? 'text-green-400' : 'text-red-400'
        }`}>
          {toolResult.message}
        </p>

        {data && (
          <div className="mt-4">
            {data.invoices ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Unpaid Invoices</h3>
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="px-4 py-2 text-left text-white">Invoice #</th>
                        <th className="px-4 py-2 text-left text-white">Customer</th>
                        <th className="px-4 py-2 text-right text-white">Amount Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.invoices.map((invoice) => (
                        <tr key={invoice.Id} className="border-t border-white/5">
                          <td className="px-4 py-2 text-white">{invoice.DocNumber}</td>
                          <td className="px-4 py-2 text-white">{invoice.CustomerRef.name}</td>
                          <td className="px-4 py-2 text-right text-white">
                            ${invoice.Balance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : data.count !== undefined ? (
              <div className="mt-2 text-2xl font-bold text-white">
                {data.count}
              </div>
            ) : data.amount !== undefined ? (
              <div className="mt-2 text-2xl font-bold text-white">
                ${data.amount.toFixed(2)}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
} 