import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  try {
    // Validate environment variables
    if (!process.env.QUICKBOOKS_CLIENT_ID) {
      throw new Error('QUICKBOOKS_CLIENT_ID is not set');
    }

    if (!process.env.QUICKBOOKS_REDIRECT_URI) {
      throw new Error('QUICKBOOKS_REDIRECT_URI is not set');
    }

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');
    
    // Store state in cookie
    const cookieStore = await cookies();
    cookieStore.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes
    });

    // Build QuickBooks OAuth URL
    const authUrl = new URL('https://appcenter.intuit.com/connect/oauth2');
    authUrl.searchParams.append('client_id', process.env.QUICKBOOKS_CLIENT_ID);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'com.intuit.quickbooks.accounting');
    authUrl.searchParams.append('redirect_uri', process.env.QUICKBOOKS_REDIRECT_URI);
    authUrl.searchParams.append('state', state);

    console.log('OAuth URL:', authUrl.toString());

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    console.error('Error initializing QuickBooks OAuth:', error);
    return new NextResponse('Failed to initialize QuickBooks connection', { status: 500 });
  }
} 