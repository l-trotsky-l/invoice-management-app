import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qb_access_token')?.value;
    const realmId = cookieStore.get('qb_realmId')?.value;

    console.log('QuickBooks Company API - Auth Check:', {
      hasAccessToken: !!accessToken,
      hasRealmId: !!realmId,
      realmId
    });

    if (!accessToken || !realmId) {
      console.error('QuickBooks Company API - Missing credentials:', {
        accessToken: !!accessToken,
        realmId: !!realmId
      });
      return NextResponse.json(
        { error: 'Not authenticated with QuickBooks' },
        { status: 401 }
      );
    }

    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`;
    console.log('QuickBooks Company API - Request URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks Company API - Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch company data: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('QuickBooks Company API - Success Response:', {
      hasCompanyInfo: !!data.CompanyInfo,
      companyName: data.CompanyInfo?.CompanyName
    });

    if (!data.CompanyInfo) {
      throw new Error('Company info not found in response');
    }

    return NextResponse.json(data.CompanyInfo);
  } catch (error) {
    console.error('QuickBooks Company API - Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch company data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qb_access_token')?.value;
    const realmId = cookieStore.get('qb_realmId')?.value;

    console.log('QuickBooks Company Selection API - Auth Check:', {
      hasAccessToken: !!accessToken,
      hasRealmId: !!realmId
    });

    if (!accessToken || !realmId) {
      return NextResponse.json(
        { error: 'Not authenticated with QuickBooks' },
        { status: 401 }
      );
    }

    const { companyId } = await request.json();

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${companyId}`;
    console.log('QuickBooks Company Selection API - Request URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('QuickBooks Company Selection API - Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('Failed to fetch company details from QuickBooks');
    }

    const data = await response.json();
    console.log('QuickBooks Company Selection API - Success Response:', {
      hasCompanyInfo: !!data.CompanyInfo,
      companyName: data.CompanyInfo?.CompanyName
    });

    // Store the selected company ID in a cookie
    const result = NextResponse.json(data);
    result.cookies.set('qb_selected_company', companyId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    return result;
  } catch (error) {
    console.error('QuickBooks Company Selection API - Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch company details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 