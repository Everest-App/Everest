import React from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTabStore } from '../../store/tab-store';
import { BODY_TYPES } from '@api-platform/core';
import { BodyType, KeyValuePair } from '@api-platform/core';
import { VariableHighlightInput } from '../common/VariableHighlightInput';
import { VariableHighlightTextarea } from '../common/VariableHighlightTextarea';

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
            <div className="body-type-selector">
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
