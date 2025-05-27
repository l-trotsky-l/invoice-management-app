import { create } from 'zustand';

interface CurrencyRef {
  name: string;
  value: string;
}

interface CustomerRef {
  name: string;
  value: string;
}

interface SalesItemLineDetail {
  ItemRef: {
    name: string;
    value: string;
  };
  UnitPrice: number;
  Qty: number;
  ItemAccountRef?: {
    name: string;
    value: string;
  };
  TaxCodeRef?: string;
}

interface LineItem {
  Id?: string;
  LineNum?: number;
  Amount: number;
  DetailType: string;
  SalesItemLineDetail?: SalesItemLineDetail;
  SubTotalLineDetail?: Record<string, never>;
}

interface Address {
  Id?: string;
  Line1: string;
  City: string;
  CountrySubDivisionCode: string;
  PostalCode: string;
  Lat?: string;
  Long?: string;
}

interface MetaData {
  CreateTime: string;
  LastModifiedByRef?: string;
  LastUpdatedTime: string;
}

interface SalesTermRef {
  name: string;
  value: string;
}

interface BillEmail {
  Address: string;
}

interface TxnTaxDetail {
  TotalTax: number;
}

export interface Invoice {
  Id: string;
  SyncToken: string;
  MetaData: MetaData;
  DocNumber: string;
  TxnDate: string;
  CurrencyRef: CurrencyRef;
  Line: LineItem[];
  TxnTaxDetail: TxnTaxDetail;
  CustomerRef: CustomerRef;
  CustomerMemo?: string;
  BillAddr: Address;
  ShipAddr?: Address;
  FreeFormAddress?: boolean;
  SalesTermRef: SalesTermRef;
  DueDate: string;
  TotalAmt: number;
  ApplyTaxAfterDiscount: boolean;
  PrintStatus: string;
  EmailStatus: string;
  BillEmail?: BillEmail;
  Balance: number;
  AllowIPNPayment: boolean;
  AllowOnlinePayment: boolean;
  AllowOnlineCreditCardPayment: boolean;
  AllowOnlineACHPayment: boolean;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

interface InvoiceStore {
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[]) => void;
  printInvoiceDetails: (invoiceId: string) => void;
}

export const useInvoiceStore = create<InvoiceStore>()((set, get) => ({
  invoices: [],
  setInvoices: (invoices: Invoice[]) => set({ invoices }),
  printInvoiceDetails: (invoiceId: string) => {
    const { invoices } = get();
    const invoice = invoices.find(inv => inv.Id === invoiceId);
    
    if (!invoice) {
      console.log('Invoice not found');
      return;
    }

    console.log('\n=== Invoice Details ===');
    console.log(`Invoice #: ${invoice.DocNumber}`);
    console.log(`ID: ${invoice.Id}`);
    console.log(`Sync Token: ${invoice.SyncToken}`);
    console.log(`Date: ${invoice.TxnDate}`);
    console.log(`Due Date: ${invoice.DueDate}`);
    console.log(`Currency: ${invoice.CurrencyRef.name} (${invoice.CurrencyRef.value})`);
    
    console.log('\nCustomer:');
    console.log(`  ID: ${invoice.CustomerRef.value}`);
    console.log(`  Name: ${invoice.CustomerRef.name}`);
    if (invoice.CustomerMemo) {
      console.log(`  Memo: ${invoice.CustomerMemo}`);
    }
    
    console.log('\nBilling Address:');
    console.log(`  ${invoice.BillAddr.Line1}`);
    console.log(`  ${invoice.BillAddr.City}, ${invoice.BillAddr.CountrySubDivisionCode} ${invoice.BillAddr.PostalCode}`);
    if (invoice.BillAddr.Lat && invoice.BillAddr.Long) {
      console.log(`  Coordinates: ${invoice.BillAddr.Lat}, ${invoice.BillAddr.Long}`);
    }
    
    if (invoice.ShipAddr) {
      console.log('\nShipping Address:');
      console.log(`  ${invoice.ShipAddr.Line1}`);
      console.log(`  ${invoice.ShipAddr.City}, ${invoice.ShipAddr.CountrySubDivisionCode} ${invoice.ShipAddr.PostalCode}`);
      if (invoice.ShipAddr.Lat && invoice.ShipAddr.Long) {
        console.log(`  Coordinates: ${invoice.ShipAddr.Lat}, ${invoice.ShipAddr.Long}`);
      }
    }
    
    console.log('\nLine Items:');
    invoice.Line.forEach(line => {
      if (line.DetailType === 'SalesItemLineDetail' && line.SalesItemLineDetail) {
        console.log(`  ${line.LineNum}. ${line.SalesItemLineDetail.ItemRef.name}`);
        console.log(`     Amount: $${line.Amount.toFixed(2)}`);
        console.log(`     Unit Price: $${line.SalesItemLineDetail.UnitPrice.toFixed(2)}`);
        console.log(`     Quantity: ${line.SalesItemLineDetail.Qty}`);
        if (line.SalesItemLineDetail.TaxCodeRef) {
          console.log(`     Tax Code: ${line.SalesItemLineDetail.TaxCodeRef}`);
        }
      } else if (line.DetailType === 'SubTotalLineDetail') {
        console.log(`  Subtotal: $${line.Amount.toFixed(2)}`);
      }
    });

    console.log('\nTax Details:');
    console.log(`  Total Tax: $${invoice.TxnTaxDetail.TotalTax.toFixed(2)}`);
    
    console.log('\nTotals:');
    console.log(`  Total Amount: $${invoice.TotalAmt.toFixed(2)}`);
    console.log(`  Balance Due: $${invoice.Balance.toFixed(2)}`);
    
    console.log('\nPayment Terms:');
    console.log(`  ${invoice.SalesTermRef.name} (${invoice.SalesTermRef.value})`);
    
    console.log('\nStatus:');
    console.log(`  Print Status: ${invoice.PrintStatus}`);
    console.log(`  Email Status: ${invoice.EmailStatus}`);
    console.log(`  Payment Status: ${invoice.status}`);
    
    if (invoice.BillEmail) {
      console.log(`\nBilling Email: ${invoice.BillEmail.Address}`);
    }
    
    console.log('\nOnline Payment Options:');
    console.log(`  Allow IPN Payment: ${invoice.AllowIPNPayment}`);
    console.log(`  Allow Online Payment: ${invoice.AllowOnlinePayment}`);
    console.log(`  Allow Online Credit Card: ${invoice.AllowOnlineCreditCardPayment}`);
    console.log(`  Allow Online ACH: ${invoice.AllowOnlineACHPayment}`);
    
    console.log('\nMetadata:');
    console.log(`  Created: ${invoice.MetaData.CreateTime}`);
    console.log(`  Last Updated: ${invoice.MetaData.LastUpdatedTime}`);
    if (invoice.MetaData.LastModifiedByRef) {
      console.log(`  Last Modified By: ${invoice.MetaData.LastModifiedByRef}`);
    }
    
    console.log('===================\n');
  }
})); 