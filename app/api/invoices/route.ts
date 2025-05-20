import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const qbCode = cookieStore.get('qb_code');
    const qbRealmId = cookieStore.get('qb_realmId');

    if (!qbCode || !qbRealmId) {
      return NextResponse.json(
        { error: 'QuickBooks not connected' },
        { status: 401 }
      );
    }

    // TODO: Implement actual QuickBooks API call to fetch invoices
    // For now, return mock data
    const mockInvoices = [
      {
        id: '1',
        number: 'INV-001',
        date: '2024-03-15',
        customer: 'Acme Corp',
        amount: 1500.00,
        status: 'Paid'
      },
      {
        id: '2',
        number: 'INV-002',
        date: '2024-03-16',
        customer: 'Globex Inc',
        amount: 2750.50,
        status: 'Pending'
      },
      {
        id: '3',
        number: 'INV-003',
        date: '2024-03-17',
        customer: 'Stark Industries',
        amount: 5000.00,
        status: 'Overdue'
      }
    ];

    return NextResponse.json(mockInvoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 