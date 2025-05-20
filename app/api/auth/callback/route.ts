import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');

    if (!code || !realmId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create the response with redirect to home
    const response = NextResponse.redirect(new URL('/', request.url));

    // Set cookies in the response headers
    response.cookies.set('qb_code', code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    });

    response.cookies.set('qb_realmId', realmId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
    });

    return response;
  } catch (error) {
    console.error('Error in QuickBooks callback:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
} 