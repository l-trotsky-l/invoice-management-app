'use client';

import { useState, useEffect } from 'react';
import InvoiceList from './InvoiceList';

export default function QuickBooksConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      console.log('Checking QuickBooks connection...');
      const response = await fetch('/api/quickbooks/check-connection');
      console.log('Connection check response:', response.status);
      
      if (response.ok) {
        console.log('Successfully connected to QuickBooks');
        setIsConnected(true);
        setError(null);
      } else if (response.status === 401) {
        console.log('Not connected to QuickBooks (expected state)');
        setIsConnected(false);
        setError(null);
      } else {
        console.error('Unexpected response:', response.status);
        throw new Error('Failed to check connection');
      }
    } catch (err) {
      console.error('Error checking connection:', err);
      setError('Failed to check QuickBooks connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      console.log('Initiating QuickBooks connection...');
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/quickbooks');
      console.log('Auth response:', response.status);
      
      if (!response.ok) {
        console.error('Failed to get auth URL:', response.status);
        throw new Error('Failed to connect to QuickBooks');
      }
      
      const data = await response.json();
      console.log('Redirecting to QuickBooks auth URL...');
      window.location.href = data.url;
    } catch (err) {
      console.error('Connection error:', err);
      setError('Failed to connect to QuickBooks. Please try again.');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={handleConnect}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isConnected) {
    return <InvoiceList />;
  }

  return (
    <div className="text-center p-6">
      <div className="bg-white/10 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Connect to QuickBooks</h2>
        <p className="text-gray-300 mb-6">
          Connect your QuickBooks account to manage invoices and payments.
        </p>
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Connecting...
            </span>
          ) : (
            'Connect with QuickBooks'
          )}
        </button>
      </div>
    </div>
  );
} 