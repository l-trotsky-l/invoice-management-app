import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');
    const state = searchParams.get('state');

    if (!code || !realmId || !state) {
      return NextResponse.redirect(new URL('/error?message=Missing required parameters', request.url));
    }

    // Verify state
    const cookieStore = await cookies();
    const stateCookie = cookieStore.get('oauth_state');
    if (!stateCookie || stateCookie.value !== state) {
      return NextResponse.redirect(new URL('/error?message=Invalid state parameter', request.url));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(new URL('/error?message=Failed to exchange authorization code', request.url));
    }

    const tokenData = await tokenResponse.json();

    // Create response with redirect
    const response = NextResponse.redirect(new URL('/', request.url));

    // Set cookies
    response.cookies.set('quickbooks_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    });

    response.cookies.set('quickbooks_refresh_token', tokenData.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    response.cookies.set('quickbooks_realm_id', realmId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });

    // Clear state cookie
    response.cookies.delete('oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/error?message=An unexpected error occurred', request.url));
  }
} 