import React from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTabStore } from '../../store/tab-store';
import { KeyValuePair } from '@api-platform/core';
import { VariableHighlightInput } from '../common/VariableHighlightInput';

export function ParamsEditor() {
    const { t } = useTranslation();
    const { tabs, activeTabId, updateParams } = useTabStore();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const { params } = activeTab.request;

    const handleChange = (id: string, field: keyof KeyValuePair, value: string | boolean) => {
        const updated = params.map((p) => (p.id === id ? { ...p, [field]: value } : p));
        updateParams(updated);
    };

    const handleAdd = () => {
        updateParams([...params, { id: uuidv4(), key: '', value: '', enabled: true }]);
    };

    const handleRemove = (id: string) => {
        if (params.length <= 1) return;
        updateParams(params.filter((p) => p.id !== id));
    };

    return (
        <div className="kv-editor">
            {params.map((param) => (
                <div key={param.id} className="kv-row">
                    <input
                        type="checkbox"
                        className="kv-checkbox"
                        checked={param.enabled}
                        onChange={(e) => handleChange(param.id, 'enabled', e.target.checked)}
                    />
                    <VariableHighlightInput
                        placeholder={t('common.key')}
                        value={param.key}
                        onChange={(val) => handleChange(param.id, 'key', val)}
                    />
                    <VariableHighlightInput
                        placeholder={t('common.value')}
                        value={param.value}
                        onChange={(val) => handleChange(param.id, 'value', val)}
                    />
                    <button className="kv-remove" onClick={() => handleRemove(param.id)} title={t('common.remove')}>
                        ×
                    </button>
                </div>
            ))}
            <button className="kv-add-btn" onClick={handleAdd}>
                {t('request.addParameter')}
            </button>
        </div>
    );
}
