import React from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTabStore } from '../../store/tab-store';
import { BODY_TYPES } from '@api-platform/core';
import { BodyType, KeyValuePair } from '@api-platform/core';
import { VariableHighlightInput } from '../common/VariableHighlightInput';
import { VariableHighlightTextarea } from '../common/VariableHighlightTextarea';
import { SFIcon } from '../common/SFIcon';

export function BodyEditor() {
    const { t } = useTranslation();
    const {
        tabs,
        activeTabId,
        updateBodyType,
        updateBodyRaw,
        updateBodyFormData,
        updateBodyUrlencoded,
    } = useTabStore();

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const { body } = activeTab.request;

    const handleFormatJson = () => {
        if (!body.raw) return;
        let text = body.raw.trim();

        const replacements: { placeholder: string; original: string }[] = [];

        // 1. Mask exact quoted variables first: "{{var}}" -> "__VAR_Q_0__"
        let masked = text.replace(/"\{\{\s*[^}\s]+\s*\}\}"/g, (match) => {
            const placeholder = `"__VAR_Q_${replacements.length}__"`;
            replacements.push({ placeholder, original: match });
            return placeholder;
        });

        // 2. Mask remaining unquoted or embedded variables: {{var}}
        masked = masked.replace(/\{\{\s*[^}\s]+\s*\}\}/g, (match, offset) => {
            const prefix = masked.slice(0, offset);
            const quoteCount = (prefix.match(/(?<!\\)"/g) || []).length;
            const isInsideString = quoteCount % 2 === 1;

            if (isInsideString) {
                const placeholder = `__VAR_EMB_${replacements.length}__`;
                replacements.push({ placeholder, original: match });
                return placeholder;
            } else {
                const placeholder = `"__VAR_UNQ_${replacements.length}__"`;
                replacements.push({ placeholder, original: match });
                return placeholder;
            }
        });

        const restoreVars = (str: string) => {
            let restored = str;
            for (let i = replacements.length - 1; i >= 0; i--) {
                const { placeholder, original } = replacements[i];
                restored = restored.replaceAll(placeholder, original);
            }
            return restored;
        };

        const tryFormat = (jsonStr: string): boolean => {
            try {
                const parsed = JSON.parse(jsonStr);
                const formatted = JSON.stringify(parsed, null, 2);
                updateBodyRaw(restoreVars(formatted));
                return true;
            } catch {
                return false;
            }
        };

        // Attempt 1: Standard JSON format after masking
        if (tryFormat(masked)) return;

        // Attempt 2: Clean loose JSON syntax (single quotes, trailing commas, unquoted keys)
        const cleaned = masked
            .replace(/'/g, '"')
            .replace(/,\s*([\}\]])/g, '$1')
            .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":');

        if (tryFormat(cleaned)) return;

        // Attempt 3: URL or Query String
        if (text.startsWith('http://') || text.startsWith('https://') || (text.includes('?') && text.includes('=')) || (text.includes('=') && text.includes('&'))) {
            try {
                let queryString = text;
                if (text.includes('?')) {
                    queryString = text.split('?')[1] || '';
                }
                if (queryString) {
                    const searchParams = new URLSearchParams(queryString);
                    const paramsObj: Record<string, string> = {};
                    searchParams.forEach((value, key) => {
                        paramsObj[key] = value;
                    });
                    if (Object.keys(paramsObj).length > 0) {
                        updateBodyRaw(JSON.stringify(paramsObj, null, 2));
                        return;
                    }
                }
            } catch { /* ignore */ }
        }

        // Attempt 4: URL decoding
        if (text.includes('%')) {
            try {
                const decoded = decodeURIComponent(text);
                if (decoded !== text && tryFormat(decoded)) return;
            } catch { /* ignore */ }
        }

        console.warn('[Beautify] Could not parse JSON. Raw input:', text);
    };

    const handleFormDataChange = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
        const updated = (body.formData || []).map((f) =>
            f.id === id ? { ...f, [field]: value } : f
        );
        updateBodyFormData(updated);
    };

    const handleUrlencodedChange = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
        const updated = (body.urlencoded || []).map((f) =>
            f.id === id ? { ...f, [field]: value } : f
        );
        updateBodyUrlencoded(updated);
    };

    return (
        <div>
            <div className="body-type-selector" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                    {BODY_TYPES.map((bt) => (
                        <button
                            key={bt.value}
                            className={`body-type-btn ${body.type === bt.value ? 'active' : ''}`}
                            onClick={() => updateBodyType(bt.value as BodyType)}
                        >
                            {bt.label}
                        </button>
                    ))}
                </div>

                {(body.type === 'json' || body.type === 'raw') && (
                    <button
                        className="toolbar-btn"
                        onClick={handleFormatJson}
                        title={t('body.formatJson', { defaultValue: 'Beautify / Format JSON' })}
                        style={{ fontSize: 11, padding: '3px 8px', gap: 4 }}
                    >
                        <SFIcon name="sparkles" size={12} />
                        <span>Beautify</span>
                    </button>
                )}
            </div>

            {body.type === 'none' && (
                <div className="empty-state" style={{ height: 120 }}>
                    <div className="empty-state-text" style={{ fontSize: 12 }}>
                        {t('body.none')}
                    </div>
                </div>
            )}

            {(body.type === 'json' || body.type === 'xml' || body.type === 'raw') && (
                <VariableHighlightTextarea
                    value={body.raw || ''}
                    onChange={(val) => updateBodyRaw(val)}
                    placeholder={
                        body.type === 'json'
                            ? '{\n  "key": "value"\n}'
                            : body.type === 'xml'
                                ? '<root>\n  <key>value</key>\n</root>'
                                : t('body.rawPlaceholder')
                    }
                />
            )}

            {body.type === 'form-data' && (
                <div className="kv-editor">
                    {(body.formData || []).map((field) => (
                        <div key={field.id} className="kv-row">
                            <input
                                type="checkbox"
                                className="kv-checkbox"
                                checked={field.enabled}
                                onChange={(e) =>
                                    handleFormDataChange(field.id, 'enabled', e.target.checked)
                                }
                            />
                            <VariableHighlightInput
                                value={field.key}
                                placeholder={t('common.key')}
                                onChange={(val) =>
                                    handleFormDataChange(field.id, 'key', val)
                                }
                            />
                            <VariableHighlightInput
                                value={field.value}
                                placeholder={t('common.value')}
                                onChange={(val) =>
                                    handleFormDataChange(field.id, 'value', val)
                                }
                            />
                            <button
                                className="kv-remove"
                                onClick={() => {
                                    if ((body.formData || []).length <= 1) return;
                                    updateBodyFormData(
                                        (body.formData || []).filter((f) => f.id !== field.id)
                                    );
                                }}
                                title={t('common.remove')}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        className="kv-add-btn"
                        onClick={() =>
                            updateBodyFormData([
                                ...(body.formData || []),
                                { id: uuidv4(), key: '', value: '', enabled: true },
                            ])
                        }
                    >
                        {t('body.addField')}
                    </button>
                </div>
            )}

            {body.type === 'x-www-form-urlencoded' && (
                <div className="kv-editor">
                    {(body.urlencoded || []).map((field) => (
                        <div key={field.id} className="kv-row">
                            <input
                                type="checkbox"
                                className="kv-checkbox"
                                checked={field.enabled}
                                onChange={(e) =>
                                    handleUrlencodedChange(field.id, 'enabled', e.target.checked)
                                }
                            />
                            <VariableHighlightInput
                                value={field.key}
                                placeholder={t('common.key')}
                                onChange={(val) =>
                                    handleUrlencodedChange(field.id, 'key', val)
                                }
                            />
                            <VariableHighlightInput
                                value={field.value}
                                placeholder={t('common.value')}
                                onChange={(val) =>
                                    handleUrlencodedChange(field.id, 'value', val)
                                }
                            />
                            <button
                                className="kv-remove"
                                onClick={() => {
                                    if ((body.urlencoded || []).length <= 1) return;
                                    updateBodyUrlencoded(
                                        (body.urlencoded || []).filter((f) => f.id !== field.id)
                                    );
                                }}
                                title={t('common.remove')}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        className="kv-add-btn"
                        onClick={() =>
                            updateBodyUrlencoded([
                                ...(body.urlencoded || []),
                                { id: uuidv4(), key: '', value: '', enabled: true },
                            ])
                        }
                    >
                        {t('body.addField')}
                    </button>
                </div>
            )}

            {body.type === 'binary' && (
                <div className="empty-state" style={{ height: 120 }}>
                    <div className="empty-state-text" style={{ fontSize: 12 }}>
                        {t('body.selectFile')}
                    </div>
                    <div className="empty-state-sub">
                        {t('body.noFileSelected')}
                    </div>
                </div>
            )}
        </div>
    );
}
