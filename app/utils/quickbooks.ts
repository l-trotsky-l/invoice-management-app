import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function refreshAccessToken() {
  try {
    console.log('Attempting to refresh QuickBooks access token...');
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('qb_refresh_token')?.value;

    if (!refreshToken) {
      console.error('No refresh token found');
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from('ABqZeJlkSB9d4IPBaCxeRnbtg5XaU9ins7OjmgoSk28Qv5iJU0:HUWWmOpDMCTjGSuUyPAvdeIjlqbc8xI3ECGLDRaN').toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text());
      throw new Error('Failed to refresh access token');
    }

    const tokenData = await response.json();
    console.log('Successfully refreshed tokens:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
    });

    // Update cookies with new tokens
    const result = NextResponse.next();
    result.cookies.set('qb_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    });

    if (tokenData.refresh_token) {
      result.cookies.set('qb_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Error refreshing QuickBooks access token:', error);
    throw error;
  }
}

export async function getValidAccessToken() {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('qb_access_token')?.value;

    if (!accessToken) {
      console.log('No access token found, attempting to refresh...');
      return await refreshAccessToken();
    }

    // TODO: Check if token is expired
    // For now, we'll just return the existing token
    return accessToken;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    throw error;
  }
} 