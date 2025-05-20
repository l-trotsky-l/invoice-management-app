import { NextResponse } from 'next/server';
import { oauthClient, quickbooksConfig } from '@/app/config/quickbooks';

export async function GET() {
  try {
    if (!quickbooksConfig.clientId || !quickbooksConfig.clientSecret) {
      throw new Error('QuickBooks credentials are not configured');
    }

    // Generate the authorization URL
    const authUri = oauthClient.authorizeUri({
      scope: quickbooksConfig.scopes,
    });

    // Redirect to QuickBooks authorization page
    return NextResponse.redirect(authUri);
  } catch (error) {
    console.error('QuickBooks authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks authorization' },
      { status: 500 }
    );
  }
} 