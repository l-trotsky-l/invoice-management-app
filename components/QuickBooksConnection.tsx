'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useInvoiceStore } from '../app/store/invoiceStore';
import InvoiceAnalytics from './InvoiceAnalytics';

export default function QuickBooksConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invoices, setInvoices, printInvoiceDetails } = useInvoiceStore();

  useEffect(() => {
    // Check if we have QuickBooks tokens
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/quickbooks/invoices');
        if (response.ok) {
          const data = await response.json();
          setInvoices(data);
          
          // Print details of the first invoice if available
          if (data.length > 0) {
            console.log('\nPrinting sample invoice details...');
            printInvoiceDetails(data[0].Id);
          }
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    };

    checkConnection();
  }, [setInvoices, printInvoiceDetails]);

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

  // If we have invoices, show the analytics
  if (invoices.length > 0) {
    return <InvoiceAnalytics />;
  }

  // Otherwise, show the connect button
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      {error && (
        <div className="text-red-400 text-sm mb-6 bg-red-500/10 px-4 py-2 rounded-full">
          {error}
        </div>
      )}

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
    </div>
  );
} 