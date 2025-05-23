import { format } from 'date-fns';

interface InvoiceLine {
  Id: string;
  LineNum: number;
  Amount: number;
  DetailType: string;
  SalesItemLineDetail?: {
    ItemRef: {
      name: string;
    };
    UnitPrice: number;
    Qty: number;
    ItemAccountRef: {
      name: string;
    };
    TaxCodeRef: string;
  };
}

interface Address {
  Id: string;
  Line1: string;
  City: string;
  CountrySubDivisionCode: string;
  PostalCode: string;
  Lat?: string;
  Long?: string;
}

interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  CurrencyRef: {
    name: string;
    value: string;
  };
  Line: InvoiceLine[];
  CustomerRef: {
    name: string;
    value: string;
  };
  CustomerMemo?: {
    value: string;
  };
  BillAddr?: Address;
  ShipAddr?: Address;
  SalesTermRef?: {
    name: string;
    value: string;
  };
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  PrintStatus: string;
  EmailStatus: string;
  BillEmail?: {
    Address: string;
  };
  MetaData: {
    CreateTime: string;
    LastUpdatedTime: string;
  };
}

interface InvoiceCardProps {
  invoice: Invoice;
}

export default function InvoiceCard({ invoice }: InvoiceCardProps) {
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.CurrencyRef.value || 'USD'
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'needtoprint':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'emailsent':
        return 'bg-green-500/20 text-green-400';
      case 'notset':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-4 border border-white/10">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">
            Invoice #{invoice.DocNumber}
          </h3>
          <p className="text-gray-400 text-sm">
            Created: {formatDate(invoice.MetaData.CreateTime)}
          </p>
        </div>
        <div className="flex gap-2">
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(invoice.PrintStatus)}`}>
            {invoice.PrintStatus}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(invoice.EmailStatus)}`}>
            {invoice.EmailStatus}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Bill To</h4>
          <div className="text-white">
            <p className="font-medium">{invoice.CustomerRef.name}</p>
            {invoice.BillAddr && (
              <>
                <p>{invoice.BillAddr.Line1}</p>
                <p>{invoice.BillAddr.City}, {invoice.BillAddr.CountrySubDivisionCode} {invoice.BillAddr.PostalCode}</p>
              </>
            )}
            {invoice.BillEmail && (
              <p className="text-gray-400 mt-1">{invoice.BillEmail.Address}</p>
            )}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">Invoice Details</h4>
          <div className="text-white">
            <p><span className="text-gray-400">Date:</span> {formatDate(invoice.TxnDate)}</p>
            <p><span className="text-gray-400">Due Date:</span> {formatDate(invoice.DueDate)}</p>
            <p><span className="text-gray-400">Terms:</span> {invoice.SalesTermRef?.name || 'N/A'}</p>
            <p><span className="text-gray-400">Currency:</span> {invoice.CurrencyRef.name}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Line Items</h4>
        <div className="bg-white/5 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/10">
                <th className="px-4 py-2 text-left text-sm text-gray-400">Item</th>
                <th className="px-4 py-2 text-right text-sm text-gray-400">Quantity</th>
                <th className="px-4 py-2 text-right text-sm text-gray-400">Unit Price</th>
                <th className="px-4 py-2 text-right text-sm text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.Line.filter(line => line.DetailType === 'SalesItemLineDetail').map((line) => (
                <tr key={line.Id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-white">
                    {line.SalesItemLineDetail?.ItemRef.name}
                  </td>
                  <td className="px-4 py-2 text-right text-white">
                    {line.SalesItemLineDetail?.Qty}
                  </td>
                  <td className="px-4 py-2 text-right text-white">
                    {formatCurrency(line.SalesItemLineDetail?.UnitPrice || 0)}
                  </td>
                  <td className="px-4 py-2 text-right text-white">
                    {formatCurrency(line.Amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.TotalAmt)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Balance Due</span>
            <span className="font-semibold text-white">{formatCurrency(invoice.Balance)}</span>
          </div>
        </div>
      </div>

      {/* Memo */}
      {invoice.CustomerMemo && (
        <div className="mt-6 pt-6 border-t border-white/10">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Memo</h4>
          <p className="text-white">{invoice.CustomerMemo.value}</p>
        </div>
      )}
    </div>
  );
} 