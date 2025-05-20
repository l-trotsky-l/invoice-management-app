declare module 'intuit-oauth' {
  interface OAuthClientConfig {
    clientId: string;
    clientSecret: string;
    environment: string;
    redirectUri: string;
  }

  interface TokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in: number;
  }

  class OAuthClient {
    constructor(config: OAuthClientConfig);
    authorizeUri(options: { scope: string[] }): string;
    createToken(url: string): Promise<{ getJson: () => TokenResponse }>;
    refreshUsingToken(refreshToken: string): Promise<{ getJson: () => TokenResponse }>;
    isAccessTokenValid(): boolean;
    getToken(): TokenResponse;
  }

  export default OAuthClient;
} 