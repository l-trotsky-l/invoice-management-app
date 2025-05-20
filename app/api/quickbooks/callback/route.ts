import { NextRequest, NextResponse } from 'next/server';
import { oauthClient } from '@/app/config/quickbooks';

export async function GET(request: NextRequest) {
  try {
    const url = request.url;
    
    // Exchange the authorization code for tokens
    const authResponse = await oauthClient.createToken(url);
    const tokens = authResponse.getJson();

    // Store the tokens securely (you should implement proper token storage)
    // For now, we'll just return them in the response
    return NextResponse.json({
      message: 'QuickBooks authorization successful',
      tokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        xRefreshTokenExpiresIn: tokens.x_refresh_token_expires_in,
      },
    });
  } catch (error) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.json(
      { error: 'Failed to complete QuickBooks authorization' },
      { status: 500 }
    );
  }
} 