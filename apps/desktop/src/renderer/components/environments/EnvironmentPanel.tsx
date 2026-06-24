import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useEnvironmentStore } from '../../store/environment-store';
import { Environment, Variable } from '@api-platform/core';
import { useDebouncedValue } from '../../hooks/useSearch';
import { searchVariables, MatchedVariable } from '../../utils/search-utils';
import { HighlightedText } from '../common/HighlightedText';

interface EnvironmentPanelProps {
    highlightVarName?: string | null;
}

export function EnvironmentPanel({ highlightVarName }: EnvironmentPanelProps) {
    const { t } = useTranslation();
    const {
        environments, activeEnvironmentId, globalVariables, loading,
        fetchEnvironments, createEnvironment, updateEnvironment, deleteEnvironment,
        setActiveEnvironment, fetchGlobalVariables, setGlobalVariables,
    } = useEnvironmentStore();

    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
    const [showGlobals, setShowGlobals] = useState(false);
    const [varSearchQuery, setVarSearchQuery] = useState('');
    const debouncedVarQuery = useDebouncedValue(varSearchQuery, 200);
    const highlightRowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchEnvironments();
        fetchGlobalVariables();
    }, [fetchEnvironments, fetchGlobalVariables]);

    // Handle highlight navigation: auto-expand the section containing the variable
    useEffect(() => {
        if (!highlightVarName) return;

        // Check if variable is in active environment
        if (activeEnvironmentId) {
            const activeEnv = environments.find(e => e.id === activeEnvironmentId);
            if (activeEnv) {
                const found = activeEnv.variables.find(v => v.key === highlightVarName);
                if (found) {
                    setEditingEnv(activeEnv);
                    // Scroll to highlighted row after render
                    setTimeout(() => highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                    return;
                }
            }
        }

        // Check globals
        const globalVar = globalVariables.find(v => v.key === highlightVarName);
        if (globalVar) {
            setShowGlobals(true);
            setTimeout(() => highlightRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        }
    }, [highlightVarName, activeEnvironmentId, environments, globalVariables]);

    const handleCreate = () => {
        if (newName.trim()) {
            createEnvironment(newName.trim());
            setNewName('');
            setShowCreate(false);
        }
    };

    const handleImportEnv = async () => {
        try {
            const result = await window.api.importFile('postman-env');
            if (result && result.success) {
                fetchEnvironments();
            } else if (result && !result.success) {
                alert(t('importExport.importFailed', { errors: result.errors?.join(', ') }));
            }
        } catch (err: any) {
            alert(t('importExport.errorImporting', { message: err.message }));
        }
    };

    const handleVarChange = (vars: Variable[], idx: number, field: keyof Variable, value: any) => {
        const updated = [...vars];
        updated[idx] = { ...updated[idx], [field]: value };
        return updated;
    };

    const addVar = (vars: Variable[]): Variable[] => [
        ...vars,
        { id: uuidv4(), key: '', value: '', enabled: true },
    ];

    const removeVar = (vars: Variable[], idx: number): Variable[] =>
        vars.filter((_, i) => i !== idx);

    const renderVarEditor = (
        vars: Variable[],
        onUpdate: (vars: Variable[]) => void,
        label: string,
        showSearch: boolean = false
    ) => {
        // Filter vars if search is active
        const isSearching = showSearch && debouncedVarQuery.trim().length > 0;
        const matchedVars = isSearching ? searchVariables(vars, debouncedVarQuery) : null;

        return (
            <div className="env-var-editor">
                <div className="env-var-label">{label}</div>

                {showSearch && (
                    <div className="env-var-search-wrapper">
                        <input
                            type="text"
                            className="env-var-search-input"
                            placeholder={t('environment.searchPlaceholder')}
                            value={varSearchQuery}
                            onChange={(e) => setVarSearchQuery(e.target.value)}
                            spellCheck={false}
                        />
                        {varSearchQuery && (
                            <button
                                className="collection-search-clear"
                                onClick={() => setVarSearchQuery('')}
                            >×</button>
                        )}
                    </div>
                )}

                {isSearching && matchedVars ? (
                    matchedVars.length > 0 ? (
                        matchedVars.map((v) => {
                            const originalIdx = vars.findIndex(ov => ov.id === v.id);
                            return (
                                <div key={v.id} className="kv-row">
                                    <input type="checkbox" className="kv-checkbox" checked={v.enabled}
                                        onChange={(e) => onUpdate(handleVarChange(vars, originalIdx, 'enabled', e.target.checked))} />
                                    <input type="text" placeholder={t('common.key')} value={v.key}
                                        onChange={(e) => onUpdate(handleVarChange(vars, originalIdx, 'key', e.target.value))} />
                                    <input type={v.secret ? 'password' : 'text'} placeholder={t('common.value')} value={v.value}
                                        onChange={(e) => onUpdate(handleVarChange(vars, originalIdx, 'value', e.target.value))} />
                                    <button className="kv-remove" style={{ opacity: 1 }}
                                        onClick={() => onUpdate(removeVar(vars, originalIdx))} title={t('common.remove')}>×</button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="empty-state" style={{ height: 40 }}>
                            <div className="empty-state-sub">{t('common.noResults')}</div>
                        </div>
                    )
                ) : (
                    vars.map((v, i) => {
                        const isHighlighted = highlightVarName && v.key === highlightVarName;
                        return (
                            <div
                                key={v.id}
                                ref={isHighlighted ? highlightRowRef : undefined}
                                className={`kv-row ${isHighlighted ? 'kv-row-highlight' : ''}`}
                            >
                                <input type="checkbox" className="kv-checkbox" checked={v.enabled}
                                    onChange={(e) => onUpdate(handleVarChange(vars, i, 'enabled', e.target.checked))} />
                                <input type="text" placeholder={t('common.key')} value={v.key}
                                    onChange={(e) => onUpdate(handleVarChange(vars, i, 'key', e.target.value))} />
                                <input type={v.secret ? 'password' : 'text'} placeholder={t('common.value')} value={v.value}
                                    onChange={(e) => onUpdate(handleVarChange(vars, i, 'value', e.target.value))} />
                                <button className="kv-remove" style={{ opacity: 1 }}
                                    onClick={() => onUpdate(removeVar(vars, i))} title={t('common.remove')}>×</button>
                            </div>
                        );
                    })
                )}
                <button className="kv-add-btn" onClick={() => onUpdate(addVar(vars))}>{t('environment.addVariable')}</button>
            </div>
        );
    };

    return (
        <div className="env-panel">
            {/* Environment Selector */}
            <div className="env-selector">
                <select
                    value={activeEnvironmentId || ''}
                    onChange={(e) => setActiveEnvironment(e.target.value || null)}
                    style={{
                        padding: '6px 8px', fontSize: 12, fontFamily: 'var(--font-sans)',
                        background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none',
                        margin: '8px 12px', width: 'calc(100% - 24px)',
                    }}
                >
                    <option value="">{t('environment.noEnvironment')}</option>
                    {environments.map(env => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>
            </div>

            {/* Global Variables */}
            <div className="env-section">
                <div
                    className="env-section-header"
                    onClick={() => setShowGlobals(!showGlobals)}
                >
                    <span>{showGlobals ? '▾' : '▸'}</span>
                    <span>🌍 {t('environment.globalVariables')}</span>
                    <span className="badge" style={{ marginInlineStart: 'auto' }}>{globalVariables.filter(v => v.enabled && v.key).length}</span>
                </div>
                {showGlobals && renderVarEditor(
                    globalVariables,
                    (vars) => setGlobalVariables(vars),
                    t('environment.globalScope'),
                    true
                )}
            </div>

            {/* Create Button */}
            <div style={{ padding: '4px 12px', display: 'flex', gap: '8px' }}>
                <button className="kv-add-btn" style={{ flex: 1 }} onClick={() => setShowCreate(!showCreate)}>
                    {t('environment.newEnvironment')}
                </button>
                <button className="kv-add-btn" style={{ flex: 1 }} onClick={handleImportEnv}>
                    {t('environment.importFromPostman')}
                </button>
            </div>

            {showCreate && (
                <div style={{ padding: '0 12px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input type="text" placeholder={t('environment.environmentName')} value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            style={{
                                flex: 1, padding: '4px 8px', fontSize: 12, fontFamily: 'var(--font-sans)',
                                background: 'var(--bg-input)', border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none',
                            }}
                            autoFocus
                        />
                        <button className="body-type-btn active" onClick={handleCreate} style={{ fontSize: 11 }}>{t('common.create')}</button>
                    </div>
                </div>
            )}

            {/* Environment List */}
            {environments.map(env => (
                <div key={env.id} className="env-section">
                    <div className="env-section-header" onClick={() => setEditingEnv(editingEnv?.id === env.id ? null : env)}>
                        <span>{editingEnv?.id === env.id ? '▾' : '▸'}</span>
                        <span>{activeEnvironmentId === env.id ? '🟢' : '⚪'} {env.name}</span>
                        <div className="collection-item-actions">
                            <button onClick={(e) => { e.stopPropagation(); setActiveEnvironment(env.id); }} title={t('environment.activate')}>✓</button>
                            <button onClick={(e) => { e.stopPropagation(); deleteEnvironment(env.id); }} title={t('common.delete')}>×</button>
                        </div>
                    </div>
                    {editingEnv?.id === env.id && renderVarEditor(
                        env.variables,
                        (vars) => updateEnvironment({ ...env, variables: vars }),
                        `${env.name} ${t('environment.variables')}`,
                        true
                    )}
                </div>
            ))}

            {!loading && environments.length === 0 && !showCreate && (
                <div className="empty-state" style={{ height: 80 }}>
                    <div className="empty-state-sub">{t('environment.noEnvironments')}</div>
                </div>
            )}
        </div>
    );
}
