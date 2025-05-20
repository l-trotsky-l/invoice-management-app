import OAuthClient from 'intuit-oauth';

// QuickBooks OAuth configuration
export const quickbooksConfig = {
  clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
  environment: process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox', // 'sandbox' or 'production'
  redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback',
  scopes: [
    'com.intuit.quickbooks.accounting',
    'com.intuit.quickbooks.payment',
    'openid',
    'profile',
    'email',
  ],
};

// Create OAuth client instance
export const oauthClient = new OAuthClient({
  clientId: quickbooksConfig.clientId,
  clientSecret: quickbooksConfig.clientSecret,
  environment: quickbooksConfig.environment,
  redirectUri: quickbooksConfig.redirectUri,
}); 