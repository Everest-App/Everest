import React, { useState, useEffect } from 'react';
import { PluginInfo, PluginManifest, PluginSetting } from '@api-platform/core';

export function PluginManager({ onClose }: { onClose: () => void }) {
    const [installedPlugins, setInstalledPlugins] = useState<PluginInfo[]>([]);
    const [catalog, setCatalog] = useState<PluginManifest[]>([]);
    const [activeView, setActiveView] = useState<'installed' | 'catalog'>('installed');
    const [expandedPlugin, setExpandedPlugin] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchPlugins = async () => {
        const [plugins, cat] = await Promise.all([
            (window.api as any).getPlugins(),
            (window.api as any).getPluginCatalog(),
        ]);
        setInstalledPlugins(plugins);
        setCatalog(cat);
    };

    useEffect(() => { fetchPlugins(); }, []);

    const handleInstall = async (manifest: PluginManifest) => {
        setLoading(true);
        try {
            // Fetch default code for catalog plugins
            const defaultCodes: Record<string, string> = {
                'plugin-timestamp-header': `if (request) { request.headers = [...(request.headers || []), { id: 'ts', key: settings.headerName || 'X-Timestamp', value: settings.format === 'unix' ? Math.floor(Date.now()/1000).toString() : settings.format === 'unix-ms' ? Date.now().toString() : new Date().toISOString(), enabled: true }]; modified = true; }`,
                'plugin-response-time-check': `if (response && response.time > (settings.threshold || 2000)) { console.warn('Response time ' + response.time + 'ms exceeds ' + settings.threshold + 'ms'); }`,
                'plugin-json-formatter': `if (request && request.body && request.body.type === 'json' && request.body.raw) { try { request.body.raw = JSON.stringify(JSON.parse(request.body.raw), null, 2); modified = true; } catch(e) {} }`,
                'plugin-auth-refresh': `if (request && settings.token) { request.headers = [...(request.headers || []), { id: 'auth', key: 'Authorization', value: (settings.scheme||'Bearer')+' '+settings.token, enabled: true }]; modified = true; }`,
                'plugin-correlation-id': `if (request) { var id='xxxx-xxxx'.replace(/x/g,()=>Math.floor(Math.random()*16).toString(16)); request.headers = [...(request.headers||[]), { id:'corr', key:'X-Correlation-ID', value:id, enabled:true }]; modified=true; }`,
                'plugin-response-size-warn': `if (response) { var kb=response.size/1024; if(kb>(settings.maxSizeKB||500)) console.warn('Response '+kb.toFixed(1)+'KB exceeds '+settings.maxSizeKB+'KB'); }`,
            };
            await (window.api as any).installPlugin(manifest, defaultCodes[manifest.id] || '// Plugin code');
            await fetchPlugins();
        } finally {
            setLoading(false);
        }
    };

    const handleUninstall = async (id: string) => {
        await (window.api as any).uninstallPlugin(id);
        await fetchPlugins();
    };

    const handleToggle = async (plugin: PluginInfo) => {
        if (plugin.enabled) {
            await (window.api as any).disablePlugin(plugin.manifest.id);
        } else {
            await (window.api as any).enablePlugin(plugin.manifest.id);
        }
        await fetchPlugins();
    };

    const handleSettingChange = async (pluginId: string, key: string, value: any) => {
        const plugin = installedPlugins.find(p => p.manifest.id === pluginId);
        if (!plugin) return;
        const newSettings = { ...plugin.settingsValues, [key]: value };
        await (window.api as any).updatePluginSettings(pluginId, newSettings);
        await fetchPlugins();
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const installedIds = new Set(installedPlugins.map(p => p.manifest.id));

    const categoryIcons: Record<string, string> = {
        auth: '🔐', transform: '🔄', testing: '🧪', utility: '🔧', visualization: '📊', other: '📦',
    };

    const renderSettingField = (pluginId: string, setting: PluginSetting, currentValue: any) => {
        switch (setting.type) {
            case 'string':
                return (
                    <input type="text" value={currentValue ?? setting.default ?? ''}
                        onChange={(e) => handleSettingChange(pluginId, setting.key, e.target.value)}
                        style={{ flex: 1, padding: '4px 8px', fontSize: 12, background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
                );
            case 'number':
                return (
                    <input type="number" value={currentValue ?? setting.default ?? 0}
                        onChange={(e) => handleSettingChange(pluginId, setting.key, parseInt(e.target.value) || 0)}
                        style={{ width: 80, padding: '4px 8px', fontSize: 12, background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }} />
                );
            case 'boolean':
                return (
                    <input type="checkbox" checked={currentValue ?? setting.default ?? false}
                        onChange={(e) => handleSettingChange(pluginId, setting.key, e.target.checked)} />
                );
            case 'select':
                return (
                    <select value={currentValue ?? setting.default}
                        onChange={(e) => handleSettingChange(pluginId, setting.key, e.target.value)}
                        style={{ padding: '4px 8px', fontSize: 12, background: 'var(--bg-input)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}>
                        {(setting.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                );
            default:
                return null;
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal" style={{ width: 700, maxHeight: '90vh' }}>
                <div className="modal-header">
                    <span className="modal-title">Plugin Manager</span>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {/* Tab bar */}
                <div className="plugin-tabs">
                    <button className={`plugin-tab ${activeView === 'installed' ? 'active' : ''}`}
                        onClick={() => setActiveView('installed')}>
                        Installed ({installedPlugins.length})
                    </button>
                    <button className={`plugin-tab ${activeView === 'catalog' ? 'active' : ''}`}
                        onClick={() => setActiveView('catalog')}>
                        Catalog
                    </button>
                </div>

                <div className="modal-body" style={{ overflow: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
                    {activeView === 'installed' && (
                        <div className="plugin-list">
                            {installedPlugins.length === 0 && (
                                <div className="empty-state" style={{ height: 120 }}>
                                    <div className="empty-state-icon">🧩</div>
                                    <div className="empty-state-sub">No plugins installed. Browse the catalog!</div>
                                </div>
                            )}
                            {installedPlugins.map(plugin => (
                                <div key={plugin.manifest.id} className="plugin-card">
                                    <div className="plugin-card-header">
                                        <span className="plugin-icon">{categoryIcons[plugin.manifest.category] || '📦'}</span>
                                        <div className="plugin-info">
                                            <div className="plugin-name">{plugin.manifest.name}</div>
                                            <div className="plugin-meta">v{plugin.manifest.version} · {plugin.manifest.author} · {plugin.manifest.category}</div>
                                        </div>
                                        <div className="plugin-actions">
                                            <label className="plugin-toggle-switch">
                                                <input type="checkbox" checked={plugin.enabled} onChange={() => handleToggle(plugin)} />
                                                <span className="plugin-toggle-slider" />
                                            </label>
                                            {plugin.manifest.settings && plugin.manifest.settings.length > 0 && (
                                                <button className="toolbar-btn" style={{ fontSize: 11 }}
                                                    onClick={() => setExpandedPlugin(expandedPlugin === plugin.manifest.id ? null : plugin.manifest.id)}>
                                                    ⚙
                                                </button>
                                            )}
                                            <button className="toolbar-btn" style={{ fontSize: 11, color: 'var(--method-delete)' }}
                                                onClick={() => handleUninstall(plugin.manifest.id)}>✕</button>
                                        </div>
                                    </div>
                                    <div className="plugin-desc">{plugin.manifest.description}</div>
                                    <div className="plugin-hooks">
                                        {plugin.manifest.hooks.map(h => (
                                            <span key={h} className="plugin-hook-badge">{h}</span>
                                        ))}
                                    </div>

                                    {/* Settings panel */}
                                    {expandedPlugin === plugin.manifest.id && plugin.manifest.settings && (
                                        <div className="plugin-settings">
                                            {plugin.manifest.settings.map(setting => (
                                                <div key={setting.key} className="plugin-setting-row">
                                                    <label className="plugin-setting-label">
                                                        {setting.label}
                                                        {setting.description && <span className="plugin-setting-desc">{setting.description}</span>}
                                                    </label>
                                                    {renderSettingField(plugin.manifest.id, setting, plugin.settingsValues[setting.key])}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeView === 'catalog' && (
                        <div className="plugin-list">
                            {catalog.map(manifest => {
                                const isInstalled = installedIds.has(manifest.id);
                                return (
                                    <div key={manifest.id} className={`plugin-card ${isInstalled ? 'installed' : ''}`}>
                                        <div className="plugin-card-header">
                                            <span className="plugin-icon">{categoryIcons[manifest.category] || '📦'}</span>
                                            <div className="plugin-info">
                                                <div className="plugin-name">{manifest.name}</div>
                                                <div className="plugin-meta">v{manifest.version} · {manifest.author} · {manifest.category}</div>
                                            </div>
                                            <div className="plugin-actions">
                                                {isInstalled ? (
                                                    <span style={{ fontSize: 11, color: 'var(--method-get)', fontWeight: 600 }}>✓ Installed</span>
                                                ) : (
                                                    <button className="send-btn" style={{ padding: '4px 12px', fontSize: 11 }}
                                                        onClick={() => handleInstall(manifest)} disabled={loading}>
                                                        Install
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="plugin-desc">{manifest.description}</div>
                                        <div className="plugin-hooks">
                                            {manifest.hooks.map(h => (
                                                <span key={h} className="plugin-hook-badge">{h}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
