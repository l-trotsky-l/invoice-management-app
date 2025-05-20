'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function QuickBooksSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const response = await fetch('/api/quickbooks/callback?' + searchParams.toString());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to complete QuickBooks connection');
        }

        // Store tokens in localStorage (in a real app, you should use a more secure method)
        localStorage.setItem('quickbooks_tokens', JSON.stringify(data.tokens));
      } catch (err) {
        console.error('QuickBooks connection error:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {error ? (
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Connection Failed
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {error}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Successfully Connected!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your QuickBooks account has been successfully connected.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 