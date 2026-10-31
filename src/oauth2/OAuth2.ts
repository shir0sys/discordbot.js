const OAUTH2_BASE_URL = "https://discord.com/api/v10/oauth2";
const AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";

export interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface AuthorizationURLOptions {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state?: string;
  prompt?: "consent" | "none";
}

/** Builds the URL to send a user to for the Discord OAuth2 consent screen (the "Login with Discord" flow). */
export function getAuthorizationURL(options: AuthorizationURLOptions): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", options.clientId);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", options.scopes.join(" "));
  if (options.state) url.searchParams.set("state", options.state);
  if (options.prompt) url.searchParams.set("prompt", options.prompt);
  return url.toString();
}

export interface ExchangeCodeOptions {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}

export async function exchangeCode(options: ExchangeCodeOptions): Promise<OAuth2TokenResponse> {
  return postTokenRequest({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    grant_type: "authorization_code",
    code: options.code,
    redirect_uri: options.redirectUri,
  });
}

export interface RefreshTokenOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export async function refreshAccessToken(options: RefreshTokenOptions): Promise<OAuth2TokenResponse> {
  return postTokenRequest({
    client_id: options.clientId,
    client_secret: options.clientSecret,
    grant_type: "refresh_token",
    refresh_token: options.refreshToken,
  });
}

export async function revokeToken(options: { clientId: string; clientSecret: string; token: string }): Promise<void> {
  const body = new URLSearchParams({ client_id: options.clientId, client_secret: options.clientSecret, token: options.token });
  const response = await fetch(`${OAUTH2_BASE_URL}/token/revoke`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Token revocation failed with status ${response.status}`);
}

async function postTokenRequest(params: Record<string, string>): Promise<OAuth2TokenResponse> {
  const response = await fetch(`${OAUTH2_BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  if (!response.ok) throw new Error(`OAuth2 token request failed with status ${response.status}`);
  return response.json() as Promise<OAuth2TokenResponse>;
}
