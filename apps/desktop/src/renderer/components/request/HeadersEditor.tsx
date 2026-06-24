import React from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTabStore } from '../../store/tab-store';
import { KeyValuePair } from '@api-platform/core';
import { HeaderValueInput } from './HeaderValueInput';
import { VariableHighlightInput } from '../common/VariableHighlightInput';

export function HeadersEditor() {
    const { t } = useTranslation();
    const { tabs, activeTabId, updateHeaders } = useTabStore();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const { headers } = activeTab.request;

    const handleChange = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
        const updated = headers.map((h) => (h.id === id ? { ...h, [field]: value } : h));
        updateHeaders(updated);
    };

    const handleAdd = () => {
        updateHeaders([...headers, { id: uuidv4(), key: '', value: '', enabled: true }]);
    };

    const handleRemove = (id: string) => {
        if (headers.length <= 1) return;
        updateHeaders(headers.filter((h) => h.id !== id));
    };

    return (
        <div className="kv-editor">
            {headers.map((header) => (
                <div key={header.id} className="kv-row">
                    <input
                        type="checkbox"
                        className="kv-checkbox"
                        checked={header.enabled}
                        onChange={(e) => handleChange(header.id, 'enabled', e.target.checked)}
                    />
                    <VariableHighlightInput
                        placeholder={t('common.key')}
                        value={header.key}
                        onChange={(val) => handleChange(header.id, 'key', val)}
                    />
                    <HeaderValueInput
                        value={header.value}
                        placeholder={t('common.value')}
                        onChange={(val) => handleChange(header.id, 'value', val)}
                    />
                    <button className="kv-remove" onClick={() => handleRemove(header.id)} title={t('common.remove')}>
                        ×
                    </button>
                </div>
            ))}
            <button className="kv-add-btn" onClick={handleAdd}>
                {t('request.addHeader')}
            </button>
        </div>
    );
}
