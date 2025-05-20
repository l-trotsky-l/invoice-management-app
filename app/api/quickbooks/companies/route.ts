import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('quickbooks_access_token')?.value;
    const realmId = cookieStore.get('quickbooks_realm_id')?.value;

    if (!accessToken || !realmId) {
      console.log('Missing authentication:', { 
        hasAccessToken: !!accessToken, 
        hasRealmId: !!realmId 
      });
      return new NextResponse('Not authenticated with QuickBooks', { status: 401 });
    }

    const response = await fetch(
      `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: 'SELECT * FROM CompanyInfo',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return new NextResponse('Failed to fetch company data', { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 