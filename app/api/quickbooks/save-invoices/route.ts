import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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
    LastModifiedByRef?: string;
  };
  FreeFormAddress?: boolean;
  ApplyTaxAfterDiscount?: boolean;
  AllowIPNPayment?: boolean;
  AllowOnlinePayment?: boolean;
  AllowOnlineCreditCardPayment?: boolean;
  AllowOnlineACHPayment?: boolean;
}

export async function POST(request: Request) {
  try {
    const invoices = await request.json() as Invoice[];
    
    // Create a formatted string of invoices
    const formattedInvoices = invoices.map((invoice: Invoice) => {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        });
      };

      const formatAddress = (addr?: Address) => {
        if (!addr) return 'Not provided';
        return `${addr.Line1}
${addr.City}, ${addr.CountrySubDivisionCode} ${addr.PostalCode}
${addr.Lat && addr.Long ? `Coordinates: ${addr.Lat}, ${addr.Long}` : ''}`;
      };

      return `
===========================================
INVOICE DETAILS
===========================================
Basic Information:
-----------------
Invoice ID: ${invoice.Id}
Invoice Number: ${invoice.DocNumber}
Transaction Date: ${formatDate(invoice.TxnDate)}
Due Date: ${formatDate(invoice.DueDate)}
Currency: ${invoice.CurrencyRef.name} (${invoice.CurrencyRef.value})

Metadata:
---------
Created: ${formatDate(invoice.MetaData.CreateTime)}
Last Updated: ${formatDate(invoice.MetaData.LastUpdatedTime)}
${invoice.MetaData.LastModifiedByRef ? `Last Modified By: ${invoice.MetaData.LastModifiedByRef}` : ''}

Customer Information:
-------------------
Customer Name: ${invoice.CustomerRef.name}
Customer ID: ${invoice.CustomerRef.value}
${invoice.BillEmail ? `Customer Email: ${invoice.BillEmail.Address}` : ''}

Billing Address:
---------------
${formatAddress(invoice.BillAddr)}

Shipping Address:
----------------
${formatAddress(invoice.ShipAddr)}

Payment Terms:
-------------
${invoice.SalesTermRef ? `Terms: ${invoice.SalesTermRef.name} (ID: ${invoice.SalesTermRef.value})` : 'No terms specified'}

Line Items:
----------
${invoice.Line.map((line, index) => {
  if (line.DetailType === 'SalesItemLineDetail' && line.SalesItemLineDetail) {
    return `Item ${index + 1}:
  - Item Name: ${line.SalesItemLineDetail.ItemRef.name}
  - Quantity: ${line.SalesItemLineDetail.Qty}
  - Unit Price: ${line.SalesItemLineDetail.UnitPrice}
  - Amount: ${line.Amount}
  - Account: ${line.SalesItemLineDetail.ItemAccountRef.name}
  - Tax Code: ${line.SalesItemLineDetail.TaxCodeRef}
  - Line Number: ${line.LineNum}
  - Line ID: ${line.Id}`;
  } else if (line.DetailType === 'SubTotalLineDetail') {
    return `Subtotal Line:
  - Amount: ${line.Amount}
  - Line ID: ${line.Id}`;
  }
  return `Other Line (${line.DetailType}):
  - Amount: ${line.Amount}
  - Line ID: ${line.Id}`;
}).join('\n\n')}

Financial Summary:
----------------
Total Amount: ${invoice.TotalAmt}
Balance Due: ${invoice.Balance}

Status Information:
-----------------
Print Status: ${invoice.PrintStatus}
Email Status: ${invoice.EmailStatus}

Additional Settings:
------------------
Free Form Address: ${invoice.FreeFormAddress ? 'Yes' : 'No'}
Apply Tax After Discount: ${invoice.ApplyTaxAfterDiscount ? 'Yes' : 'No'}
Allow IPN Payment: ${invoice.AllowIPNPayment ? 'Yes' : 'No'}
Allow Online Payment: ${invoice.AllowOnlinePayment ? 'Yes' : 'No'}
Allow Online Credit Card Payment: ${invoice.AllowOnlineCreditCardPayment ? 'Yes' : 'No'}
Allow Online ACH Payment: ${invoice.AllowOnlineACHPayment ? 'Yes' : 'No'}

${invoice.CustomerMemo ? `
Customer Memo:
-------------
${invoice.CustomerMemo.value}
` : ''}
===========================================
`;
    }).join('\n\n');

    // Save to a file in the public directory so it's easily accessible
    const filePath = join(process.cwd(), 'public', 'invoices.txt');
    await writeFile(filePath, formattedInvoices, 'utf-8');

    return NextResponse.json({ success: true, message: 'Invoices saved successfully' });
  } catch (error) {
    console.error('Error saving invoices:', error);
    return NextResponse.json(
      { error: 'Failed to save invoices' },
      { status: 500 }
    );
  }
} 