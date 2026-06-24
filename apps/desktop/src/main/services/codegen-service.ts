import { RequestConfig, CodeGenTarget, CodeGenResult, KeyValuePair } from '@api-platform/core';
import { buildFinalUrl } from '../utils/url-builder';
import { interpolateRequestConfig } from '@api-platform/core';
import { getGlobalVariables } from './environment-service';

/**
 * Generate code snippet from a request configuration.
 */
export function generateCode(rawConfig: RequestConfig, target: CodeGenTarget): CodeGenResult {
    // Variable interpolation awareness
    // We try to interpolate with global variables for now. 
    // In a fuller implementation, environment ID could be passed here.
    const config = interpolateRequestConfig(rawConfig, getGlobalVariables(), [], []);

    const generators: Record<CodeGenTarget, (c: RequestConfig) => string> = {
        'curl': generateCurl,
        'fetch': generateFetch,
        'axios': generateAxios,
        'python-requests': generatePythonRequests,
        'csharp': generateCSharp,
        'dotnet': generateDotNet,
        'restsharp': generateRestSharp,
        'java': generateJava,
        'go': generateGo,
        'php': generatePHP,
        'dart': generateDart,
    };

    const generator = generators[target];
    if (!generator) {
        throw new Error(`Unknown code generation target: ${target}`);
    }

    return {
        target,
        code: generator(config),
    };
}

function getEnabledHeaders(config: RequestConfig): KeyValuePair[] {
    return config.headers.filter(h => h.enabled && h.key);
}

function getEnabledParams(config: RequestConfig): KeyValuePair[] {
    return config.params.filter(p => p.enabled && p.key);
}

function buildFullUrl(config: RequestConfig): string {
    return buildFinalUrl(config);
}

// ─── cURL ────────────────────────────────────────────────────────
function generateCurl(config: RequestConfig): string {
    const parts: string[] = ['curl'];

    if (config.method !== 'GET') {
        parts.push(`-X ${config.method}`);
    }

    parts.push(`'${buildFullUrl(config)}'`);

    // Headers
    for (const h of getEnabledHeaders(config)) {
        parts.push(`-H '${h.key}: ${h.value}'`);
    }

    // Auth headers
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        parts.push(`-H 'Authorization: Bearer ${config.auth.bearer.token}'`);
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        parts.push(`-u '${config.auth.basic.username}:${config.auth.basic.password || ''}'`);
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        if (config.auth.apiKey.addTo === 'header') {
            parts.push(`-H '${config.auth.apiKey.key}: ${config.auth.apiKey.value || ''}'`);
        }
    }

    // Body
    if (config.body.type === 'json' && config.body.raw) {
        parts.push(`-H 'Content-Type: application/json'`);
        parts.push(`-d '${config.body.raw}'`);
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const data = config.body.urlencoded
            .filter(f => f.enabled && f.key)
            .map(f => `${encodeURIComponent(f.key)}=${encodeURIComponent(f.value)}`)
            .join('&');
        parts.push(`-d '${data}'`);
    } else if (config.body.type === 'form-data' && config.body.formData) {
        for (const f of config.body.formData.filter(f => f.enabled && f.key)) {
            parts.push(`-F '${f.key}=${f.value}'`);
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        parts.push(`-d '${config.body.raw}'`);
    }

    return parts.join(' \\\n  ');
}

// ─── Fetch ───────────────────────────────────────────────────────
function generateFetch(config: RequestConfig): string {
    const headers: Record<string, string> = {};
    for (const h of getEnabledHeaders(config)) {
        headers[h.key] = h.value;
    }

    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${config.auth.bearer.token}`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        headers['Authorization'] = `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password || ''}`)}`;
    }

    const options: any = {
        method: config.method,
    };

    if (Object.keys(headers).length > 0) {
        options.headers = headers;
    }

    let bodyLine = '';
    let preCode = '';
    if (config.body.type === 'json' && config.body.raw) {
        headers['Content-Type'] = 'application/json';
        bodyLine = `  body: JSON.stringify(${config.body.raw}),\n`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        headers['Content-Type'] = 'application/xml';
        bodyLine = `  body: '${config.body.raw}',\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            preCode = `const formData = new FormData();\n`;
            for (const f of fields) {
                preCode += `formData.append('${f.key}', '${f.value}');\n`;
            }
            preCode += `\n`;
            bodyLine = `  body: formData,\n`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            preCode = `const params = new URLSearchParams();\n`;
            for (const f of fields) {
                preCode += `params.append('${f.key}', '${f.value}');\n`;
            }
            preCode += `\n`;
            bodyLine = `  body: params,\n`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        bodyLine = `  body: '${config.body.raw}',\n`;
    }

    let code = preCode;
    code += `fetch('${buildFullUrl(config)}', {\n`;
    code += `  method: '${config.method}',\n`;
    if (Object.keys(headers).length > 0) {
        code += `  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')},\n`;
    }
    code += bodyLine;
    code += `})\n`;
    code += `.then(response => response.json())\n`;
    code += `.then(data => console.log(data))\n`;
    code += `.catch(error => console.error('Error:', error));`;

    return code;
}

// ─── Axios ───────────────────────────────────────────────────────
function generateAxios(config: RequestConfig): string {
    const headers: Record<string, string> = {};
    for (const h of getEnabledHeaders(config)) {
        headers[h.key] = h.value;
    }

    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${config.auth.bearer.token}`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        headers['Authorization'] = `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password || ''}`)}`;
    }

    let code = `const axios = require('axios');\n\n`;
    code += `axios({\n`;
    code += `  method: '${config.method.toLowerCase()}',\n`;
    code += `  url: '${buildFullUrl(config)}',\n`;

    if (Object.keys(headers).length > 0) {
        code += `  headers: ${JSON.stringify(headers, null, 4).replace(/\n/g, '\n  ')},\n`;
    }

    if (config.body.type === 'json' && config.body.raw) {
        code += `  data: ${config.body.raw},\n`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        headers['Content-Type'] = 'application/xml';
        code += `  data: '${config.body.raw}',\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            let fd = `  data: (() => {\n`;
            fd += `    const form = new FormData();\n`;
            for (const f of fields) {
                fd += `    form.append('${f.key}', '${f.value}');\n`;
            }
            fd += `    return form;\n`;
            fd += `  })(),\n`;
            code += fd;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            const params: Record<string, string> = {};
            for (const f of fields) {
                params[f.key] = f.value;
            }
            code += `  data: new URLSearchParams(${JSON.stringify(params, null, 4).replace(/\n/g, '\n  ')}),\n`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `  data: '${config.body.raw}',\n`;
    }

    code += `})\n`;
    code += `.then(response => {\n`;
    code += `  console.log(response.data);\n`;
    code += `})\n`;
    code += `.catch(error => {\n`;
    code += `  console.error(error);\n`;
    code += `});`;

    return code;
}

// ─── Python Requests ─────────────────────────────────────────────
function generatePythonRequests(config: RequestConfig): string {
    const headers: Record<string, string> = {};
    for (const h of getEnabledHeaders(config)) {
        headers[h.key] = h.value;
    }

    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        headers['Authorization'] = `Bearer ${config.auth.bearer.token}`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        headers['Authorization'] = `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password || ''}`)}`;
    }

    let code = `import requests\n\n`;
    code += `url = "${buildFullUrl(config)}"\n`;

    if (Object.keys(headers).length > 0) {
        code += `headers = ${JSON.stringify(headers, null, 4).replace(/"/g, '"')}\n`;
    }

    if (config.body.type === 'json' && config.body.raw) {
        code += `payload = ${config.body.raw}\n\n`;
        code += `response = requests.${config.method.toLowerCase()}(url`;
        if (Object.keys(headers).length > 0) code += `, headers=headers`;
        code += `, json=payload`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        headers['Content-Type'] = 'application/xml';
        code += `payload = """${config.body.raw}"""\n\n`;
        code += `response = requests.${config.method.toLowerCase()}(url`;
        if (Object.keys(headers).length > 0) code += `, headers=headers`;
        code += `, data=payload`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `files = {\n`;
            for (const f of fields) {
                code += `    "${f.key}": (None, "${f.value}"),\n`;
            }
            code += `}\n\n`;
            code += `response = requests.${config.method.toLowerCase()}(url`;
            if (Object.keys(headers).length > 0) code += `, headers=headers`;
            code += `, files=files`;
        } else {
            code += `\nresponse = requests.${config.method.toLowerCase()}(url`;
            if (Object.keys(headers).length > 0) code += `, headers=headers`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `payload = {\n`;
            for (const f of fields) {
                code += `    "${f.key}": "${f.value}",\n`;
            }
            code += `}\n\n`;
            code += `response = requests.${config.method.toLowerCase()}(url`;
            if (Object.keys(headers).length > 0) code += `, headers=headers`;
            code += `, data=payload`;
        } else {
            code += `\nresponse = requests.${config.method.toLowerCase()}(url`;
            if (Object.keys(headers).length > 0) code += `, headers=headers`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `payload = """${config.body.raw}"""\n\n`;
        code += `response = requests.${config.method.toLowerCase()}(url`;
        if (Object.keys(headers).length > 0) code += `, headers=headers`;
        code += `, data=payload`;
    } else {
        code += `\nresponse = requests.${config.method.toLowerCase()}(url`;
        if (Object.keys(headers).length > 0) code += `, headers=headers`;
    }

    code += `)\n\n`;
    code += `print(response.status_code)\n`;
    code += `print(response.json())`;

    return code;
}

// ─── C# HttpClient ───────────────────────────────────────────────
function generateCSharp(config: RequestConfig): string {
    const url = buildFullUrl(config);
    const headers = getEnabledHeaders(config);

    let code = `using System.Net.Http;\n`;
    code += `using System.Text;\n\n`;
    code += `var client = new HttpClient();\n`;
    code += `var request = new HttpRequestMessage(HttpMethod.${config.method.charAt(0).toUpperCase() + config.method.slice(1).toLowerCase()}, "${url}");\n\n`;

    // Headers
    for (const h of headers) {
        code += `request.Headers.Add("${h.key}", "${h.value}");\n`;
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        code += `request.Headers.Add("Authorization", "Bearer ${config.auth.bearer.token}");\n`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        code += `request.Headers.Add("Authorization", "Basic " + Convert.ToBase64String(Encoding.UTF8.GetBytes("${config.auth.basic.username}:${config.auth.basic.password || ''}")));\n`;
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        code += `request.Headers.Add("${config.auth.apiKey.key}", "${config.auth.apiKey.value || ''}");\n`;
    }

    code += `\n`;

    // Body
    if (config.body.type === 'json' && config.body.raw) {
        code += `request.Content = new StringContent(${JSON.stringify(config.body.raw)}, Encoding.UTF8, "application/json");\n`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        code += `request.Content = new StringContent(${JSON.stringify(config.body.raw)}, Encoding.UTF8, "application/xml");\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `var formData = new MultipartFormDataContent();\n`;
            for (const f of fields) {
                code += `formData.Add(new StringContent("${f.value}"), "${f.key}");\n`;
            }
            code += `request.Content = formData;\n`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `request.Content = new FormUrlEncodedContent(new Dictionary<string, string>\n`;
            code += `{\n`;
            for (const f of fields) {
                code += `    { "${f.key}", "${f.value}" },\n`;
            }
            code += `});\n`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `request.Content = new StringContent(${JSON.stringify(config.body.raw)}, Encoding.UTF8);\n`;
    }

    code += `\n`;
    code += `HttpResponseMessage response = await client.SendAsync(request);\n`;
    code += `string responseBody = await response.Content.ReadAsStringAsync();\n`;
    code += `Console.WriteLine(responseBody);`;

    return code;
}

// ─── .NET HttpClient (modern) ────────────────────────────────────
function generateDotNet(config: RequestConfig): string {
    const url = buildFullUrl(config);
    const headers = getEnabledHeaders(config);

    let code = `using var client = new HttpClient();\n`;
    code += `using var request = new HttpRequestMessage(HttpMethod.${config.method.charAt(0).toUpperCase() + config.method.slice(1).toLowerCase()}, "${url}");\n\n`;

    // Headers
    for (const h of headers) {
        code += `request.Headers.Add("${h.key}", "${h.value}");\n`;
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        code += `request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "${config.auth.bearer.token}");\n`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        code += `request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("${config.auth.basic.username}:${config.auth.basic.password || ''}")));\n`;
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        code += `request.Headers.Add("${config.auth.apiKey.key}", "${config.auth.apiKey.value || ''}");\n`;
    }

    code += `\n`;

    // Body
    if (config.body.type === 'json' && config.body.raw) {
        code += `request.Content = JsonContent.Create(new {\n`;
        try {
            const parsed = JSON.parse(config.body.raw);
            for (const [key, value] of Object.entries(parsed)) {
                code += `    ${key} = ${JSON.stringify(value)},\n`;
            }
        } catch {
            code += `    // raw JSON\n`;
        }
        code += `});\n`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        code += `request.Content = new StringContent(${JSON.stringify(config.body.raw)}, System.Text.Encoding.UTF8, "application/xml");\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `using var formData = new MultipartFormDataContent();\n`;
            for (const f of fields) {
                code += `formData.Add(new StringContent("${f.value}"), "${f.key}");\n`;
            }
            code += `request.Content = formData;\n`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `request.Content = new FormUrlEncodedContent(new Dictionary<string, string>\n`;
            code += `{\n`;
            for (const f of fields) {
                code += `    ["${f.key}"] = "${f.value}",\n`;
            }
            code += `});\n`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `request.Content = new StringContent(${JSON.stringify(config.body.raw)}, System.Text.Encoding.UTF8);\n`;
    }

    code += `\n`;
    code += `using var response = await client.SendAsync(request);\n`;
    code += `var body = await response.Content.ReadAsStringAsync();\n`;
    code += `Console.WriteLine($"Status: {response.StatusCode}");\n`;
    code += `Console.WriteLine(body);`;

    return code;
}

// ─── C# RestSharp v114 ───────────────────────────────────────────
function generateRestSharp(config: RequestConfig): string {
    const fullUrl = buildFullUrl(config);
    const headers = getEnabledHeaders(config);
    const params = getEnabledParams(config);

    // Split URL into base URL and resource path for RestSharp's API
    let baseUrl: string;
    let resourcePath: string;

    try {
        // Remove query params from URL for splitting
        const urlWithoutQuery = config.url.includes('?') ? config.url.slice(0, config.url.indexOf('?')) : config.url;
        const urlObj = new URL(urlWithoutQuery.match(/^https?:\/\//i) ? urlWithoutQuery : `http://${urlWithoutQuery}`);
        baseUrl = `${urlObj.protocol}//${urlObj.host}`;
        resourcePath = urlObj.pathname === '/' ? '' : urlObj.pathname;
    } catch {
        // Fallback if URL parsing fails
        baseUrl = fullUrl;
        resourcePath = '';
    }

    // Map HTTP method to RestSharp Method enum
    const methodMap: Record<string, string> = {
        'GET': 'Get',
        'POST': 'Post',
        'PUT': 'Put',
        'PATCH': 'Patch',
        'DELETE': 'Delete',
        'OPTIONS': 'Options',
        'HEAD': 'Head',
    };
    const restMethod = methodMap[config.method] || 'Get';

    let code = `using RestSharp;\n\n`;
    code += `var options = new RestClientOptions("${baseUrl}");\n`;
    code += `var client = new RestClient(options);\n\n`;

    if (resourcePath) {
        code += `var request = new RestRequest("${resourcePath}", Method.${restMethod});\n`;
    } else {
        code += `var request = new RestRequest("", Method.${restMethod});\n`;
    }

    // Query parameters (added separately for clean code)
    if (params.length > 0) {
        code += `\n`;
        for (const p of params) {
            code += `request.AddQueryParameter("${p.key}", "${p.value}");\n`;
        }
    }

    // Headers
    if (headers.length > 0) {
        code += `\n`;
        for (const h of headers) {
            code += `request.AddHeader("${h.key}", "${h.value}");\n`;
        }
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        code += `request.AddHeader("Authorization", "Bearer ${config.auth.bearer.token}");\n`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        code += `request.AddHeader("Authorization", "Basic " + Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes("${config.auth.basic.username}:${config.auth.basic.password || ''}")));\n`;
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        if (config.auth.apiKey.addTo === 'header') {
            code += `request.AddHeader("${config.auth.apiKey.key}", "${config.auth.apiKey.value || ''}");\n`;
        } else {
            code += `request.AddQueryParameter("${config.auth.apiKey.key}", "${config.auth.apiKey.value || ''}");\n`;
        }
    }

    // Body
    code += `\n`;
    if (config.body.type === 'json' && config.body.raw) {
        try {
            const parsed = JSON.parse(config.body.raw);
            const props = Object.entries(parsed)
                .map(([key, value]) => `    ${key} = ${JSON.stringify(value)}`)
                .join(',\n');
            code += `request.AddJsonBody(new\n{\n${props}\n});\n`;
        } catch {
            // If JSON parsing fails, use raw string
            code += `request.AddStringBody(${JSON.stringify(config.body.raw)}, ContentType.Json);\n`;
        }
    } else if (config.body.type === 'xml' && config.body.raw) {
        code += `request.AddStringBody(${JSON.stringify(config.body.raw)}, ContentType.Xml);\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            for (const f of fields) {
                code += `request.AddParameter("${f.key}", "${f.value}", ParameterType.GetOrPost);\n`;
            }
            code += `request.AlwaysMultipartFormData = true;\n`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            for (const f of fields) {
                code += `request.AddParameter("${f.key}", "${f.value}", ParameterType.GetOrPost);\n`;
            }
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `request.AddStringBody(${JSON.stringify(config.body.raw)}, ContentType.Plain);\n`;
    }

    code += `\n`;
    code += `var response = await client.ExecuteAsync(request);\n\n`;
    code += `Console.WriteLine(response.Content);`;

    return code;
}

// ─── Java OkHttp ─────────────────────────────────────────────────
function generateJava(config: RequestConfig): string {
    const url = buildFullUrl(config);
    const headers = getEnabledHeaders(config);

    let code = `import okhttp3.*;\n\n`;
    code += `OkHttpClient client = new OkHttpClient();\n\n`;

    // Body
    const method = config.method.toUpperCase();
    const needsBody = method !== 'GET' && method !== 'HEAD';

    if (needsBody) {
        if (config.body.type === 'json' && config.body.raw) {
            code += `MediaType mediaType = MediaType.parse("application/json");\n`;
            code += `RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(config.body.raw)});\n\n`;
        } else if (config.body.type === 'xml' && config.body.raw) {
            code += `MediaType mediaType = MediaType.parse("application/xml");\n`;
            code += `RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(config.body.raw)});\n\n`;
        } else if (config.body.type === 'form-data' && config.body.formData) {
            const fields = config.body.formData.filter(f => f.enabled && f.key);
            if (fields.length > 0) {
                code += `RequestBody body = new MultipartBody.Builder()\n`;
                code += `    .setType(MultipartBody.FORM)\n`;
                for (const f of fields) {
                    code += `    .addFormDataPart("${f.key}", "${f.value}")\n`;
                }
                code += `    .build();\n\n`;
            } else {
                code += `RequestBody body = RequestBody.create("", null);\n\n`;
            }
        } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
            const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
            if (fields.length > 0) {
                code += `RequestBody body = new FormBody.Builder()\n`;
                for (const f of fields) {
                    code += `    .add("${f.key}", "${f.value}")\n`;
                }
                code += `    .build();\n\n`;
            } else {
                code += `RequestBody body = RequestBody.create("", null);\n\n`;
            }
        } else if (config.body.type === 'raw' && config.body.raw) {
            code += `MediaType mediaType = MediaType.parse("text/plain");\n`;
            code += `RequestBody body = RequestBody.create(mediaType, ${JSON.stringify(config.body.raw)});\n\n`;
        } else {
            code += `RequestBody body = RequestBody.create("", null);\n\n`;
        }
    }

    code += `Request request = new Request.Builder()\n`;
    code += `    .url("${url}")\n`;

    if (needsBody) {
        code += `    .method("${method}", body)\n`;
    } else {
        code += `    .method("${method}", null)\n`;
    }

    // Headers
    for (const h of headers) {
        code += `    .addHeader("${h.key}", "${h.value}")\n`;
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        code += `    .addHeader("Authorization", "Bearer ${config.auth.bearer.token}")\n`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        code += `    .addHeader("Authorization", Credentials.basic("${config.auth.basic.username}", "${config.auth.basic.password || ''}"))\n`;
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        code += `    .addHeader("${config.auth.apiKey.key}", "${config.auth.apiKey.value || ''}")\n`;
    }

    code += `    .build();\n\n`;
    code += `Response response = client.newCall(request).execute();\n`;
    code += `System.out.println(response.body().string());`;

    return code;
}

// ─── Go net/http ─────────────────────────────────────────────────
function generateGo(config: RequestConfig): string {
    const url = buildFullUrl(config);
    const headers = getEnabledHeaders(config);
    const method = config.method.toUpperCase();

    let code = `package main\n\n`;
    code += `import (\n`;
    code += `\t"fmt"\n`;
    code += `\t"io"\n`;
    code += `\t"net/http"\n`;

    // Determine extra imports
    const needsStrings = (config.body.type === 'raw' && config.body.raw) ||
        (config.body.type === 'xml' && config.body.raw);
    const needsJson = config.body.type === 'json' && config.body.raw;
    const needsBytes = needsJson;
    const needsUrl = config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded;
    const needsMime = config.body.type === 'form-data' && config.body.formData;

    if (needsStrings) code += `\t"strings"\n`;
    if (needsJson) code += `\t"encoding/json"\n`;
    if (needsBytes) code += `\t"bytes"\n`;
    if (needsUrl) code += `\t"net/url"\n`;
    if (needsMime) {
        code += `\t"bytes"\n`;
        code += `\t"mime/multipart"\n`;
    }

    code += `)\n\n`;
    code += `func main() {\n`;

    // Body setup
    let bodyVar = 'nil';
    if (config.body.type === 'json' && config.body.raw) {
        code += `\tpayload, _ := json.Marshal(map[string]interface{}{\n`;
        try {
            const parsed = JSON.parse(config.body.raw);
            for (const [key, value] of Object.entries(parsed)) {
                code += `\t\t"${key}": ${JSON.stringify(value)},\n`;
            }
        } catch {
            code += `\t\t// raw JSON\n`;
        }
        code += `\t})\n\n`;
        bodyVar = 'bytes.NewBuffer(payload)';
    } else if (config.body.type === 'xml' && config.body.raw) {
        code += `\tbody := strings.NewReader(${JSON.stringify(config.body.raw)})\n\n`;
        bodyVar = 'body';
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `\tvar b bytes.Buffer\n`;
            code += `\tw := multipart.NewWriter(&b)\n`;
            for (const f of fields) {
                code += `\tw.WriteField("${f.key}", "${f.value}")\n`;
            }
            code += `\tw.Close()\n\n`;
            bodyVar = '&b';
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `\tdata := url.Values{}\n`;
            for (const f of fields) {
                code += `\tdata.Set("${f.key}", "${f.value}")\n`;
            }
            code += `\n`;
            bodyVar = 'strings.NewReader(data.Encode())';
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `\tbody := strings.NewReader(${JSON.stringify(config.body.raw)})\n\n`;
        bodyVar = 'body';
    }

    code += `\treq, err := http.NewRequest("${method}", "${url}", ${bodyVar})\n`;
    code += `\tif err != nil {\n`;
    code += `\t\tfmt.Println(err)\n`;
    code += `\t\treturn\n`;
    code += `\t}\n\n`;

    // Headers
    for (const h of headers) {
        code += `\treq.Header.Set("${h.key}", "${h.value}")\n`;
    }

    if (config.body.type === 'json') {
        code += `\treq.Header.Set("Content-Type", "application/json")\n`;
    } else if (config.body.type === 'xml') {
        code += `\treq.Header.Set("Content-Type", "application/xml")\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        code += `\treq.Header.Set("Content-Type", w.FormDataContentType())\n`;
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        code += `\treq.Header.Set("Authorization", "Bearer ${config.auth.bearer.token}")\n`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        code += `\treq.SetBasicAuth("${config.auth.basic.username}", "${config.auth.basic.password || ''}")\n`;
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        code += `\treq.Header.Set("${config.auth.apiKey.key}", "${config.auth.apiKey.value || ''}")\n`;
    }

    code += `\n`;
    code += `\tclient := &http.Client{}\n`;
    code += `\tresp, err := client.Do(req)\n`;
    code += `\tif err != nil {\n`;
    code += `\t\tfmt.Println(err)\n`;
    code += `\t\treturn\n`;
    code += `\t}\n`;
    code += `\tdefer resp.Body.Close()\n\n`;
    code += `\trespBody, _ := io.ReadAll(resp.Body)\n`;
    code += `\tfmt.Println(string(respBody))\n`;
    code += `}`;

    return code;
}

// ─── PHP Guzzle ──────────────────────────────────────────────────
function generatePHP(config: RequestConfig): string {
    const url = buildFullUrl(config);
    const headers = getEnabledHeaders(config);

    let code = `<?php\n`;
    code += `require 'vendor/autoload.php';\n\n`;
    code += `use GuzzleHttp\\Client;\n\n`;
    code += `$client = new Client();\n\n`;

    // Build headers
    const headerObj: Record<string, string> = {};
    for (const h of headers) {
        headerObj[h.key] = h.value;
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        headerObj['Authorization'] = `Bearer ${config.auth.bearer.token}`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        headerObj['Authorization'] = `Basic ` + btoa(`${config.auth.basic.username}:${config.auth.basic.password || ''}`);
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        headerObj[config.auth.apiKey.key] = config.auth.apiKey.value || '';
    }

    code += `$response = $client->request('${config.method}', '${url}', [\n`;

    // Headers
    if (Object.keys(headerObj).length > 0) {
        code += `    'headers' => [\n`;
        for (const [key, value] of Object.entries(headerObj)) {
            code += `        '${key}' => '${value}',\n`;
        }
        code += `    ],\n`;
    }

    // Body
    if (config.body.type === 'json' && config.body.raw) {
        code += `    'json' => json_decode('${config.body.raw}', true),\n`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        headerObj['Content-Type'] = 'application/xml';
        code += `    'body' => '${config.body.raw}',\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `    'multipart' => [\n`;
            for (const f of fields) {
                code += `        [\n`;
                code += `            'name' => '${f.key}',\n`;
                code += `            'contents' => '${f.value}',\n`;
                code += `        ],\n`;
            }
            code += `    ],\n`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            code += `    'form_params' => [\n`;
            for (const f of fields) {
                code += `        '${f.key}' => '${f.value}',\n`;
            }
            code += `    ],\n`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        code += `    'body' => '${config.body.raw}',\n`;
    }

    code += `]);\n\n`;
    code += `echo $response->getStatusCode() . "\\n";\n`;
    code += `echo $response->getBody();`;

    return code;
}

// ─── Dart Dio ────────────────────────────────────────────────────
function generateDart(config: RequestConfig): string {
    const url = buildFullUrl(config);
    const headers = getEnabledHeaders(config);

    let code = `import 'package:dio/dio.dart';\n\n`;
    code += `void main() async {\n`;
    code += `  final dio = Dio();\n\n`;

    // Build headers map
    const headerObj: Record<string, string> = {};
    for (const h of headers) {
        headerObj[h.key] = h.value;
    }

    // Auth
    if (config.auth.type === 'bearer' && config.auth.bearer?.token) {
        headerObj['Authorization'] = `Bearer ${config.auth.bearer.token}`;
    } else if (config.auth.type === 'basic' && config.auth.basic?.username) {
        headerObj['Authorization'] = `Basic ${btoa(`${config.auth.basic.username}:${config.auth.basic.password || ''}`)}`;
    } else if (config.auth.type === 'api-key' && config.auth.apiKey?.key) {
        headerObj[config.auth.apiKey.key] = config.auth.apiKey.value || '';
    }

    // Body
    let dataLine = '';
    if (config.body.type === 'json' && config.body.raw) {
        headerObj['Content-Type'] = 'application/json';
        dataLine = `  final data = ${config.body.raw};\n\n`;
    } else if (config.body.type === 'xml' && config.body.raw) {
        headerObj['Content-Type'] = 'application/xml';
        dataLine = `  final data = '${config.body.raw}';\n\n`;
    } else if (config.body.type === 'form-data' && config.body.formData) {
        const fields = config.body.formData.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            dataLine = `  final data = FormData.fromMap({\n`;
            for (const f of fields) {
                dataLine += `    '${f.key}': '${f.value}',\n`;
            }
            dataLine += `  });\n\n`;
        }
    } else if (config.body.type === 'x-www-form-urlencoded' && config.body.urlencoded) {
        const fields = config.body.urlencoded.filter(f => f.enabled && f.key);
        if (fields.length > 0) {
            headerObj['Content-Type'] = 'application/x-www-form-urlencoded';
            dataLine = `  final data = {\n`;
            for (const f of fields) {
                dataLine += `    '${f.key}': '${f.value}',\n`;
            }
            dataLine += `  };\n\n`;
        }
    } else if (config.body.type === 'raw' && config.body.raw) {
        dataLine = `  final data = '${config.body.raw}';\n\n`;
    }

    code += dataLine;

    code += `  try {\n`;
    code += `    final response = await dio.request(\n`;
    code += `      '${url}',\n`;
    if (dataLine) {
        code += `      data: data,\n`;
    }
    code += `      options: Options(\n`;
    code += `        method: '${config.method}',\n`;

    if (Object.keys(headerObj).length > 0) {
        code += `        headers: {\n`;
        for (const [key, value] of Object.entries(headerObj)) {
            code += `          '${key}': '${value}',\n`;
        }
        code += `        },\n`;
    }

    code += `      ),\n`;
    code += `    );\n\n`;
    code += `    print(response.statusCode);\n`;
    code += `    print(response.data);\n`;
    code += `  } catch (e) {\n`;
    code += `    print('Error: $e');\n`;
    code += `  }\n`;
    code += `}`;

    return code;
}
