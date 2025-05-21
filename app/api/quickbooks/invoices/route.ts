import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qb_access_token')?.value;
    const realmId = cookieStore.get('qb_realm_id')?.value;

    console.log('QuickBooks Invoices API - Auth Check:', {
      hasAccessToken: !!accessToken,
      hasRealmId: !!realmId,
      realmId
    });

    if (!accessToken || !realmId) {
      console.error('QuickBooks Invoices API - Missing credentials:', {
        accessToken: !!accessToken,
        realmId: !!realmId
      });
      return NextResponse.json(
        { error: 'Not authenticated with QuickBooks' },
        { status: 401 }
      );
    }

    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`;
    console.log('QuickBooks Invoices API - Request URL:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/text'
      },
      body: 'SELECT * FROM Invoice ORDER BY TxnDate DESC'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks Invoices API - Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch invoices: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('QuickBooks Invoices API - Success Response:', {
      hasInvoices: !!data.QueryResponse?.Invoice,
      invoiceCount: data.QueryResponse?.Invoice?.length || 0
    });

    return NextResponse.json(data.QueryResponse?.Invoice || []);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
} 