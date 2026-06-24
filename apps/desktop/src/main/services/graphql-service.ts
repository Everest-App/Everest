import axios from 'axios';
import { GraphQLRequest, GraphQLResponse, GraphQLIntrospection, GraphQLSchemaField, KeyValuePair } from '@api-platform/core';

const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType { name }
    mutationType { name }
    subscriptionType { name }
    types {
      name
      kind
      fields {
        name
        type { name kind ofType { name kind ofType { name kind } } }
        args { name type { name kind ofType { name kind } } }
        description
      }
    }
  }
}`;

function flattenType(typeObj: any): string {
    if (!typeObj) return 'unknown';
    if (typeObj.name) return typeObj.name;
    if (typeObj.ofType) return `${flattenType(typeObj.ofType)}!`;
    return typeObj.kind || 'unknown';
}

export async function sendGraphQL(req: GraphQLRequest): Promise<GraphQLResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    for (const h of req.headers) {
        if (h.enabled && h.key) headers[h.key] = h.value;
    }

    let variables: any;
    if (req.variables) {
        try { variables = JSON.parse(req.variables); } catch { variables = undefined; }
    }

    const startTime = performance.now();
    try {
        const response = await axios.post(req.url, {
            query: req.query,
            variables,
            operationName: req.operationName || undefined,
        }, {
            headers,
            timeout: 30000,
            validateStatus: () => true,
        });

        const body = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);

        return {
            data: response.data.data || null,
            errors: response.data.errors,
            status: response.status,
            time: Math.round(performance.now() - startTime),
            size: Buffer.byteLength(body, 'utf-8'),
        };
    } catch (error: any) {
        return {
            data: null,
            errors: [{ message: error.message || 'Network error' }],
            status: 0,
            time: Math.round(performance.now() - startTime),
            size: 0,
        };
    }
}

export async function introspectGraphQL(url: string, headers: KeyValuePair[]): Promise<GraphQLIntrospection> {
    const headerMap: Record<string, string> = { 'Content-Type': 'application/json' };
    for (const h of headers) {
        if (h.enabled && h.key) headerMap[h.key] = h.value;
    }

    const response = await axios.post(url, { query: INTROSPECTION_QUERY }, {
        headers: headerMap,
        timeout: 15000,
    });

    const schema = response.data?.data?.__schema;
    if (!schema) throw new Error('Invalid introspection response');

    const typeMap = new Map<string, any>();
    for (const t of schema.types || []) {
        typeMap.set(t.name, t);
    }

    const mapFields = (typeName: string | null): GraphQLSchemaField[] => {
        if (!typeName) return [];
        const type = typeMap.get(typeName);
        if (!type?.fields) return [];
        return type.fields.map((f: any) => ({
            name: f.name,
            type: flattenType(f.type),
            args: f.args?.map((a: any) => ({ name: a.name, type: flattenType(a.type) })),
            description: f.description || undefined,
        }));
    };

    return {
        queryType: { fields: mapFields(schema.queryType?.name) },
        mutationType: schema.mutationType ? { fields: mapFields(schema.mutationType.name) } : undefined,
        subscriptionType: schema.subscriptionType ? { fields: mapFields(schema.subscriptionType.name) } : undefined,
        types: (schema.types || [])
            .filter((t: any) => !t.name.startsWith('__'))
            .map((t: any) => ({
                name: t.name,
                kind: t.kind,
                fields: t.fields?.map((f: any) => ({
                    name: f.name,
                    type: flattenType(f.type),
                    description: f.description || undefined,
                })),
            })),
    };
}
