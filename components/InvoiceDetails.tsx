'use client';

import { useState, useEffect } from 'react';

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: string;
}

interface CompanyInfo {
  CompanyName: string;
  LegalName: string;
  CompanyAddr: {
    Line1: string;
    City: string;
    Country: string;
  };
}

interface ApiError {
  error: string;
  details?: string;
}

export default function InvoiceDetails() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/quickbooks/company');
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch company data');
      }
      const data = await response.json();
      if (data.CompanyName !== 'Sandbox Company_US_1') {
        throw new Error('Invalid sandbox company');
      }
      setCompanyInfo(data);
    } catch (err) {
      console.error('Error fetching company info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company information');
    }
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/invoices');
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to fetch invoices');
      }
      const data = await response.json();
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await fetchCompanyInfo();
        await fetchInvoices();
      } catch (err) {
        console.error('Error during initialization:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize');
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-300">Loading company data and invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-red-400 text-center">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg font-medium">{error}</p>
        </div>
        <button
          onClick={() => {
            setIsLoading(true);
            fetchCompanyInfo();
            fetchInvoices();
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!companyInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-xl font-medium text-white mb-2">Company Not Found</h3>
          <p className="text-gray-300">Unable to load company information.</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">{companyInfo.CompanyName}</h2>
          <p className="text-gray-300">{companyInfo.CompanyAddr.Line1}, {companyInfo.CompanyAddr.City}</p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-white mb-2">No Invoices Found</h3>
            <p className="text-gray-300">Your QuickBooks account doesn&apos;t have any invoices yet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">{companyInfo.CompanyName}</h2>
        <p className="text-gray-300">{companyInfo.CompanyAddr.Line1}, {companyInfo.CompanyAddr.City}</p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Invoices</h3>
        <button
          onClick={fetchInvoices}
          className="p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-colors duration-200"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-medium text-white">Invoice #{invoice.number}</h3>
                <p className="text-gray-300 text-sm">{invoice.date}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  invoice.status === 'Paid'
                    ? 'bg-green-500/20 text-green-400'
                    : invoice.status === 'Pending'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xl font-bold text-white">${invoice.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 