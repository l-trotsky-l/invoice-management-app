import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Checking QuickBooks connection status...');
    const cookieStore = await cookies();
    // const accessToken = cookieStore.get('quickbooks_access_token');
    // const realmId = cookieStore.get('quickbooks_realm_id');

    const accessToken = cookieStore.get('qb_access_token');
    const realmId = cookieStore.get('qb_realmId');

    console.log('Cookie check:', {
      hasAccessToken: accessToken,
      hasRealmId: realmId
    });

    if (!accessToken || !realmId) {
      console.log('No tokens found, returning 401');
      return new NextResponse('Not connected to QuickBooks', { status: 401 });
    }

    // Test the connection by making a simple API call
    console.log('Testing QuickBooks API connection...');
    console.log('Access token:', accessToken.value);
    console.log('Realm ID:', realmId.value);
    
    const response = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId.value}/companyinfo/${realmId.value}`, {
      headers: {
        'Authorization': `Bearer ${accessToken.value}`,
        'Accept': 'application/json'
      }
    });

    console.log('QuickBooks API response:', response.status);

    if (!response.ok) {
      console.log('Invalid tokens, clearing cookies');
      // Clear invalid tokens
      const res = new NextResponse('Invalid QuickBooks connection', { status: 401 });
      res.cookies.delete('quickbooks_access_token');
      res.cookies.delete('quickbooks_refresh_token');
      res.cookies.delete('quickbooks_realm_id');
      return res;
    }

    console.log('Successfully connected to QuickBooks');
    return new NextResponse('Connected to QuickBooks', { status: 200 });
  } catch (error) {
    console.error('Error checking QuickBooks connection:', error);
    return new NextResponse('Error checking connection', { status: 500 });
  }
} 