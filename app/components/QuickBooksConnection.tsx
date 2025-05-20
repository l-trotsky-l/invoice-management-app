'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function QuickBooksConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Check if we have QuickBooks tokens stored
    const checkConnection = () => {
      try {
        const tokens = localStorage.getItem('quickbooks_tokens');
        setIsConnected(!!tokens);
      } catch (err) {
        console.error('Error checking QuickBooks connection:', err);
      }
    };

    checkConnection();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Redirect to QuickBooks authorization endpoint
      window.location.href = '/api/quickbooks/authorize';
    } catch (err) {
      console.error('Failed to connect to QuickBooks:', err);
      setError('Failed to connect to QuickBooks. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    try {
      localStorage.removeItem('quickbooks_tokens');
      setIsConnected(false);
    } catch (err) {
      console.error('Error disconnecting from QuickBooks:', err);
      setError('Failed to disconnect from QuickBooks. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {isConnected ? (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-lg font-medium">Connected to QuickBooks</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-8 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full hover:bg-red-500/30 transition-all duration-300 font-medium"
          >
            Disconnect
          </button>
        </div>
      ) : (
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
      )}

      {error && (
        <div className="text-red-400 text-sm mt-2 bg-red-500/10 px-4 py-2 rounded-full">
          {error}
        </div>
      )}
    </div>
  );
} 