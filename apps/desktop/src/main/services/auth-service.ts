import axios from 'axios';
import { AuthConfig } from '@api-platform/core';

/**
 * Applies authentication configuration to the request headers (and optionally URL).
 * Mutates the headers object in place.
 */
export function applyAuth(
    auth: AuthConfig,
    headers: Record<string, string>,
    url: string
): string {
    switch (auth.type) {
        case 'bearer':
            if (auth.bearer?.token) {
                headers['Authorization'] = `Bearer ${auth.bearer.token}`;
            }
            break;

        case 'basic':
            if (auth.basic?.username) {
                const encoded = Buffer.from(
                    `${auth.basic.username}:${auth.basic.password || ''}`
                ).toString('base64');
                headers['Authorization'] = `Basic ${encoded}`;
            }
            break;

        case 'api-key':
            if (auth.apiKey?.key && auth.apiKey.value) {
                if (auth.apiKey.addTo === 'header') {
                    headers[auth.apiKey.key] = auth.apiKey.value;
                } else {
                    // Add to query string
                    const separator = url.includes('?') ? '&' : '?';
                    url = `${url}${separator}${encodeURIComponent(auth.apiKey.key)}=${encodeURIComponent(auth.apiKey.value)}`;
                }
            }
            break;

        case 'oauth2':
            // If we already have a token, use it
            if (auth.oauth2?.token) {
                headers['Authorization'] = `Bearer ${auth.oauth2.token}`;
            }
            break;

        case 'none':
        default:
            break;
    }

    return url;
}

/**
 * Fetch an OAuth2 token using client credentials grant.
 */
export async function fetchOAuth2Token(auth: AuthConfig): Promise<string> {
    if (auth.type !== 'oauth2' || !auth.oauth2) {
        throw new Error('Invalid OAuth2 configuration');
    }

    const { accessTokenUrl, clientId, clientSecret, scope } = auth.oauth2;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    if (scope) {
        params.append('scope', scope);
    }

    const response = await axios.post(accessTokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.access_token;
}
