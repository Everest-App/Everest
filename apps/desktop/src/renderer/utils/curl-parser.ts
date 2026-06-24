import { v4 as uuidv4 } from 'uuid';
import {
  RequestConfig,
  HttpMethod,
  BodyType,
  KeyValuePair,
  AuthConfig,
} from '@api-platform/core';
import { parseUrlParams } from './url-params-sync';

export interface CurlParseResult {
  success: boolean;
  request?: RequestConfig;
  error?: string;
  warnings: string[];
}

/**
 * Detect whether a string looks like a cURL command.
 */
export function isCurlCommand(text: string): boolean {
  const trimmed = text.trim();
  return /^curl\s/i.test(trimmed);
}

/**
 * Parse a cURL command string into a RequestConfig.
 */
export function parseCurl(input: string): CurlParseResult {
  const warnings: string[] = [];

  try {
    // Normalize: join continuation lines (backslash-newline)
    let raw = input
      .replace(/\\\r?\n/g, ' ')
      .replace(/\r?\n/g, ' ')
      .trim();

    // Must start with "curl"
    if (!/^curl\s/i.test(raw)) {
      return { success: false, error: 'Input does not start with "curl"', warnings };
    }

    // Remove "curl" prefix
    raw = raw.replace(/^curl\s+/i, '');

    // Tokenize (respects single and double quotes)
    const tokens = tokenize(raw);

    let method: HttpMethod = 'GET';
    let url = '';
    const headers: KeyValuePair[] = [];
    let bodyRaw = '';
    let bodyType: BodyType = 'none';
    let auth: AuthConfig = { type: 'none' };
    const formDataEntries: KeyValuePair[] = [];
    let methodExplicit = false;

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];

      // Method
      if (token === '-X' || token === '--request') {
        i++;
        if (i < tokens.length) {
          const m = tokens[i].toUpperCase();
          if (['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(m)) {
            method = m as HttpMethod;
            methodExplicit = true;
          } else {
            warnings.push(`Unknown HTTP method: ${m}, defaulting to GET`);
          }
        }
      }
      // Headers
      else if (token === '-H' || token === '--header') {
        i++;
        if (i < tokens.length) {
          const headerStr = tokens[i];
          const colonIdx = headerStr.indexOf(':');
          if (colonIdx > 0) {
            const key = headerStr.substring(0, colonIdx).trim();
            const value = headerStr.substring(colonIdx + 1).trim();
            // Skip pseudo-headers from browser copies
            if (!key.startsWith(':')) {
              headers.push({ id: uuidv4(), key, value, enabled: true });
            }
          }
        }
      }
      // Body data
      else if (['-d', '--data', '--data-raw', '--data-binary', '--data-ascii'].includes(token)) {
        i++;
        if (i < tokens.length) {
          bodyRaw = tokens[i];
          if (!methodExplicit) method = 'POST';
        }
      }
      // Form data
      else if (token === '-F' || token === '--form') {
        i++;
        if (i < tokens.length) {
          const formStr = tokens[i];
          const eqIdx = formStr.indexOf('=');
          if (eqIdx > 0) {
            formDataEntries.push({
              id: uuidv4(),
              key: formStr.substring(0, eqIdx),
              value: formStr.substring(eqIdx + 1),
              enabled: true,
            });
          }
          if (!methodExplicit) method = 'POST';
        }
      }
      // Basic auth
      else if (token === '-u' || token === '--user') {
        i++;
        if (i < tokens.length) {
          const parts = tokens[i].split(':');
          auth = {
            type: 'basic',
            basic: { username: parts[0] || '', password: parts.slice(1).join(':') || '' },
          };
        }
      }
      // URL flag
      else if (token === '--url') {
        i++;
        if (i < tokens.length) url = tokens[i];
      }
      // Compressed (ignore but note)
      else if (token === '--compressed') {
        // Skip, browsers add this
      }
      // Location follow
      else if (token === '-L' || token === '--location') {
        // Skip
      }
      // Insecure
      else if (token === '-k' || token === '--insecure') {
        warnings.push('--insecure flag detected (SSL verification disabled)');
      }
      // Verbose / silent flags (skip)
      else if (['-v', '--verbose', '-s', '--silent', '-S', '--show-error', '-i', '--include'].includes(token)) {
        // Skip
      }
      // Cookie
      else if (token === '-b' || token === '--cookie') {
        i++;
        if (i < tokens.length) {
          headers.push({ id: uuidv4(), key: 'Cookie', value: tokens[i], enabled: true });
        }
      }
      // User-Agent
      else if (token === '-A' || token === '--user-agent') {
        i++;
        if (i < tokens.length) {
          headers.push({ id: uuidv4(), key: 'User-Agent', value: tokens[i], enabled: true });
        }
      }
      // Referer
      else if (token === '-e' || token === '--referer') {
        i++;
        if (i < tokens.length) {
          headers.push({ id: uuidv4(), key: 'Referer', value: tokens[i], enabled: true });
        }
      }
      // Content-Type shorthand
      else if (token === '--json') {
        i++;
        if (i < tokens.length) {
          bodyRaw = tokens[i];
          if (!methodExplicit) method = 'POST';
          // Ensure content-type is JSON
          if (!headers.some(h => h.key.toLowerCase() === 'content-type')) {
            headers.push({ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true });
          }
        }
      }
      // Unknown flags with arguments (skip the arg too)
      else if (token.startsWith('-') && token.length > 1 && !token.startsWith('--')) {
        // Short flag, might consume next arg if not another flag
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          warnings.push(`Skipped unknown flag: ${token} ${tokens[i + 1]}`);
          i++;
        } else {
          warnings.push(`Skipped unknown flag: ${token}`);
        }
      } else if (token.startsWith('--')) {
        if (i + 1 < tokens.length && !tokens[i + 1].startsWith('-')) {
          warnings.push(`Skipped unknown flag: ${token} ${tokens[i + 1]}`);
          i++;
        } else {
          warnings.push(`Skipped unknown flag: ${token}`);
        }
      }
      // Positional argument → URL
      else if (!url) {
        url = token;
      }

      i++;
    }

    if (!url) {
      return { success: false, error: 'No URL found in cURL command', warnings };
    }

    // Remove quotes from URL if present
    url = url.replace(/^['"]|['"]$/g, '');

    // Parse query params from URL using the safe parser
    // (handles {{variable}} placeholders, unlike new URL() which throws)
    const { baseUrl: parsedBase, params: parsedParams } = parseUrlParams(url);
    const params: KeyValuePair[] = [...parsedParams];
    if (parsedParams.length > 0) {
      url = parsedBase;
    }

    // Add empty row for editor convenience
    params.push({ id: uuidv4(), key: '', value: '', enabled: true });

    // Determine body type from content-type header
    const contentTypeHeader = headers.find(h => h.key.toLowerCase() === 'content-type');
    const contentType = contentTypeHeader?.value?.toLowerCase() || '';

    if (formDataEntries.length > 0) {
      bodyType = 'form-data';
      formDataEntries.push({ id: uuidv4(), key: '', value: '', enabled: true });
    } else if (bodyRaw) {
      if (contentType.includes('application/json') || isJsonLike(bodyRaw)) {
        bodyType = 'json';
        // Try to pretty-print JSON
        try { bodyRaw = JSON.stringify(JSON.parse(bodyRaw), null, 2); } catch { /* keep raw */ }
      } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
        bodyType = 'xml';
      } else if (contentType.includes('x-www-form-urlencoded')) {
        bodyType = 'x-www-form-urlencoded';
      } else {
        bodyType = 'raw';
      }
    }

    // Check for Authorization header → extract auth
    const authHeaderIdx = headers.findIndex(h => h.key.toLowerCase() === 'authorization');
    if (authHeaderIdx >= 0 && auth.type === 'none') {
      const authValue = headers[authHeaderIdx].value;
      if (authValue.toLowerCase().startsWith('bearer ')) {
        auth = { type: 'bearer', bearer: { token: authValue.substring(7).trim() } };
        headers.splice(authHeaderIdx, 1);
      } else if (authValue.toLowerCase().startsWith('basic ')) {
        try {
          const decoded = atob(authValue.substring(6).trim());
          const [username, ...rest] = decoded.split(':');
          auth = { type: 'basic', basic: { username, password: rest.join(':') } };
          headers.splice(authHeaderIdx, 1);
        } catch {
          // Keep as header if decode fails
        }
      }
    }

    // Add empty row for headers editor
    headers.push({ id: uuidv4(), key: '', value: '', enabled: true });

    // Parse urlencoded body into key-value pairs
    const urlencodedEntries: KeyValuePair[] = [];
    if (bodyType === 'x-www-form-urlencoded' && bodyRaw) {
      const parts = bodyRaw.split('&');
      for (const part of parts) {
        const eqIdx = part.indexOf('=');
        if (eqIdx >= 0) {
          urlencodedEntries.push({
            id: uuidv4(),
            key: decodeURIComponent(part.substring(0, eqIdx)),
            value: decodeURIComponent(part.substring(eqIdx + 1)),
            enabled: true,
          });
        }
      }
      urlencodedEntries.push({ id: uuidv4(), key: '', value: '', enabled: true });
    }

    const request: RequestConfig = {
      id: uuidv4(),
      method,
      url,
      params,
      headers,
      body: {
        type: bodyType,
        raw: bodyType !== 'form-data' && bodyType !== 'x-www-form-urlencoded' ? bodyRaw : '',
        formData: formDataEntries.length > 0 ? formDataEntries : [{ id: uuidv4(), key: '', value: '', enabled: true }],
        urlencoded: urlencodedEntries.length > 0 ? urlencodedEntries : [{ id: uuidv4(), key: '', value: '', enabled: true }],
      },
      auth,
    };

    return { success: true, request, warnings };
  } catch (err: any) {
    return { success: false, error: `Parse error: ${err.message}`, warnings };
  }
}

/**
 * Tokenize a shell-like string respecting single/double quotes.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escape) {
      current += ch;
      escape = false;
      continue;
    }

    if (ch === '\\' && !inSingle) {
      escape = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (ch === ' ' && !inSingle && !inDouble) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

function isJsonLike(str: string): boolean {
  const trimmed = str.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}
