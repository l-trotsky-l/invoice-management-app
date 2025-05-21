import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');

    console.log('Received OAuth callback with params:', { code, state, realmId });

    if (!code || !state || !realmId) {
      console.error('Missing required parameters:', { code, state, realmId });
      return NextResponse.redirect(new URL('/error?message=Missing required parameters', request.url));
    }

    // Verify state
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('oauth_state');
    console.log('State verification:', {
      receivedState: state,
      storedState: stateCookie?.value
    });

    if (!stateCookie || stateCookie.value !== state) {
      console.error('State verification failed:', {
        receivedState: state,
        storedState: stateCookie?.value
      });
      return NextResponse.redirect(new URL('/error?message=Invalid state parameter', request.url));
    }

    // Exchange code for tokens
    console.log('Exchanging authorization code for tokens...');
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from('ABqZeJlkSB9d4IPBaCxeRnbtg5XaU9ins7OjmgoSk28Qv5iJU0:HUWWmOpDMCTjGSuUyPAvdeIjlqbc8xI3ECGLDRaN').toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: 'http://localhost:3000/api/auth/quickbooks/callback',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for tokens:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/error?message=Failed to exchange authorization code', request.url));
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully obtained tokens:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/', request.url));

    // Set cookies
    response.cookies.set('qb_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    });

    response.cookies.set('qb_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    response.cookies.set('qb_realm_id', realmId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    // Clear state cookie
    response.cookies.delete('oauth_state');

    console.log('Successfully set cookies and redirecting to home page');
    return response;
  } catch (error) {
    console.error('Error in QuickBooks callback:', error);
    return NextResponse.redirect(new URL('/error?message=An unexpected error occurred', request.url));
  }
} 