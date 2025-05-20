import Link from 'next/link';

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-red-200 rounded-lg p-4">
            <h1 className="text-2xl font-semibold text-red-900 mb-4">
              Connection Error
            </h1>
            <p className="text-gray-600">
              There was an error connecting to QuickBooks. Please try again or contact support if the problem persists.
            </p>
            <div className="mt-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 