'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import InvoiceCard from './InvoiceCard';

interface Invoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  CurrencyRef: {
    name: string;
    value: string;
  };
  Line: Array<{
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
  }>;
  CustomerRef: {
    name: string;
    value: string;
  };
  CustomerMemo?: {
    value: string;
  };
  BillAddr?: {
    Id: string;
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
    Lat?: string;
    Long?: string;
  };
  ShipAddr?: {
    Id: string;
    Line1: string;
    City: string;
    CountrySubDivisionCode: string;
    PostalCode: string;
    Lat?: string;
    Long?: string;
  };
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

export default function QuickBooksConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have QuickBooks tokens
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/quickbooks/invoices');
        if (response.ok) {
          const data = await response.json();
          setInvoices(data);
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    };

    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      console.log('Initiating QuickBooks OAuth flow...');

      // QuickBooks OAuth configuration
      const clientId = 'ABqZeJlkSB9d4IPBaCxeRnbtg5XaU9ins7OjmgoSk28Qv5iJU0';
      const redirectUri = 'http://localhost:3000/api/auth/quickbooks/callback';
      const scopes = ['com.intuit.quickbooks.accounting', 'com.intuit.quickbooks.payment'];
      
      // Generate random state for CSRF protection
      const state = Math.random().toString(36).substring(7);
      console.log('Generated state for CSRF protection:', state);

      // Store state in cookie
      document.cookie = `oauth_state=${state}; path=/; max-age=600; SameSite=Lax`;

      // Construct the authorization URL
      const authUrl = new URL('https://appcenter.intuit.com/app/connect/oauth2/authorize');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('state', state);

      console.log('Redirecting to QuickBooks authorization URL:', authUrl.toString());
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Error initiating QuickBooks connection:', error);
      setError('Failed to connect to QuickBooks. Please try again.');
      setIsConnecting(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoadingInvoices(true);
      setError(null);
      const response = await fetch('/api/quickbooks/invoices');
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data);

      // Save invoices to file
      const saveResponse = await fetch('/api/quickbooks/save-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!saveResponse.ok) {
        console.error('Failed to save invoices to file');
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to fetch invoices. Please try again.');
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {invoices.length > 0 ? (
        <div className="flex-1 overflow-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Your Invoices</h3>
            <button
              onClick={fetchInvoices}
              disabled={isLoadingInvoices}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isLoadingInvoices ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <InvoiceCard key={invoice.Id} invoice={invoice} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`group relative flex items-center gap-3 px-8 py-4 rounded-full font-medium transition-all duration-300
              ${isConnecting 
                ? 'bg-blue-500/50 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg hover:shadow-blue-500/25'
              }`}
          >
            {isConnecting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Image
                  src="/quickbooks-logo.svg"
                  alt="QuickBooks logo"
                  width={24}
                  height={24}
                  className="dark:invert"
                />
                <span>Connect to QuickBooks</span>
              </>
            )}
          </button>

          {error && (
            <div className="text-red-400 text-sm mt-4 bg-red-500/10 px-4 py-2 rounded-full">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 