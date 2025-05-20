import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  const cookieStore = cookies();
  const qbCode = cookieStore.get('qb_code');
  const qbRealmId = cookieStore.get('qb_realmId');

  // If we don't have the QuickBooks credentials, redirect to home
  if (!qbCode || !qbRealmId) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-4">
            <h1 className="text-2xl font-semibold text-gray-900 mb-4">
              QuickBooks Connected Successfully
            </h1>
            <p className="text-gray-600">
              Your QuickBooks account has been connected. You can now manage your invoices and sync data with QuickBooks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 