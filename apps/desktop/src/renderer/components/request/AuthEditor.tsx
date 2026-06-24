import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTabStore } from '../../store/tab-store';
import { AUTH_TYPES } from '@api-platform/core';
import { AuthType, AuthConfig } from '@api-platform/core';

export function AuthEditor() {
    const { t } = useTranslation();
    const { tabs, activeTabId, updateAuthType, updateAuth } = useTabStore();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const { auth } = activeTab.request;

    const handleAuthChange = (updates: Partial<AuthConfig>) => {
        updateAuth({ ...auth, ...updates });
    };

    return (
        <div>
            <div className="auth-type-selector">
                {AUTH_TYPES.map((at) => (
                    <button
                        key={at.value}
                        className={`auth-type-btn ${auth.type === at.value ? 'active' : ''}`}
                        onClick={() => updateAuthType(at.value as AuthType)}
                    >
                        {at.label}
                    </button>
                ))}
            </div>

            {auth.type === 'none' && (
                <div className="empty-state" style={{ height: 100 }}>
                    <div className="empty-state-text" style={{ fontSize: 12 }}>
                        {t('auth.noAuth')}
                    </div>
                </div>
            )}

            {auth.type === 'bearer' && (
                <div className="auth-fields">
                    <div className="auth-field">
                        <label>{t('auth.token')}</label>
                        <input
                            type="text"
                            value={auth.bearer?.token || ''}
                            onChange={(e) =>
                                handleAuthChange({ bearer: { token: e.target.value } })
                            }
                            placeholder={`${t('auth.token')}...`}
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}

            {auth.type === 'basic' && (
                <div className="auth-fields">
                    <div className="auth-field">
                        <label>{t('auth.username')}</label>
                        <input
                            type="text"
                            value={auth.basic?.username || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    basic: {
                                        username: e.target.value,
                                        password: auth.basic?.password || '',
                                    },
                                })
                            }
                            placeholder={t('auth.username')}
                        />
                    </div>
                    <div className="auth-field">
                        <label>{t('auth.password')}</label>
                        <input
                            type="password"
                            value={auth.basic?.password || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    basic: {
                                        username: auth.basic?.username || '',
                                        password: e.target.value,
                                    },
                                })
                            }
                            placeholder={t('auth.password')}
                        />
                    </div>
                </div>
            )}

            {auth.type === 'api-key' && (
                <div className="auth-fields">
                    <div className="auth-field">
                        <label>{t('common.key')}</label>
                        <input
                            type="text"
                            value={auth.apiKey?.key || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    apiKey: {
                                        key: e.target.value,
                                        value: auth.apiKey?.value || '',
                                        addTo: auth.apiKey?.addTo || 'header',
                                    },
                                })
                            }
                            placeholder="e.g. X-API-Key"
                        />
                    </div>
                    <div className="auth-field">
                        <label>{t('common.value')}</label>
                        <input
                            type="text"
                            value={auth.apiKey?.value || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    apiKey: {
                                        key: auth.apiKey?.key || '',
                                        value: e.target.value,
                                        addTo: auth.apiKey?.addTo || 'header',
                                    },
                                })
                            }
                            placeholder={t('common.value')}
                            spellCheck={false}
                        />
                    </div>
                    <div className="auth-field">
                        <label>{t('auth.addTo')}</label>
                        <select
                            value={auth.apiKey?.addTo || 'header'}
                            onChange={(e) =>
                                handleAuthChange({
                                    apiKey: {
                                        key: auth.apiKey?.key || '',
                                        value: auth.apiKey?.value || '',
                                        addTo: e.target.value as 'header' | 'query',
                                    },
                                })
                            }
                        >
                            <option value="header">{t('auth.header')}</option>
                            <option value="query">{t('auth.queryParam')}</option>
                        </select>
                    </div>
                </div>
            )}

            {auth.type === 'oauth2' && (
                <div className="auth-fields">
                    <div className="auth-field">
                        <label>{t('auth.accessTokenUrl')}</label>
                        <input
                            type="text"
                            value={auth.oauth2?.accessTokenUrl || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    oauth2: {
                                        ...auth.oauth2!,
                                        grantType: auth.oauth2?.grantType || 'client_credentials',
                                        accessTokenUrl: e.target.value,
                                        clientId: auth.oauth2?.clientId || '',
                                        clientSecret: auth.oauth2?.clientSecret || '',
                                    },
                                })
                            }
                            placeholder="https://example.com/oauth/token"
                            spellCheck={false}
                        />
                    </div>
                    <div className="auth-field">
                        <label>{t('auth.clientId')}</label>
                        <input
                            type="text"
                            value={auth.oauth2?.clientId || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    oauth2: {
                                        ...auth.oauth2!,
                                        grantType: auth.oauth2?.grantType || 'client_credentials',
                                        accessTokenUrl: auth.oauth2?.accessTokenUrl || '',
                                        clientId: e.target.value,
                                        clientSecret: auth.oauth2?.clientSecret || '',
                                    },
                                })
                            }
                            placeholder={t('auth.clientId')}
                        />
                    </div>
                    <div className="auth-field">
                        <label>{t('auth.clientSecret')}</label>
                        <input
                            type="password"
                            value={auth.oauth2?.clientSecret || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    oauth2: {
                                        ...auth.oauth2!,
                                        grantType: auth.oauth2?.grantType || 'client_credentials',
                                        accessTokenUrl: auth.oauth2?.accessTokenUrl || '',
                                        clientId: auth.oauth2?.clientId || '',
                                        clientSecret: e.target.value,
                                    },
                                })
                            }
                            placeholder={t('auth.clientSecret')}
                        />
                    </div>
                    <div className="auth-field">
                        <label>{t('auth.token')}</label>
                        <input
                            type="text"
                            value={auth.oauth2?.token || ''}
                            onChange={(e) =>
                                handleAuthChange({
                                    oauth2: {
                                        ...auth.oauth2!,
                                        grantType: auth.oauth2?.grantType || 'client_credentials',
                                        accessTokenUrl: auth.oauth2?.accessTokenUrl || '',
                                        clientId: auth.oauth2?.clientId || '',
                                        clientSecret: auth.oauth2?.clientSecret || '',
                                        token: e.target.value,
                                    },
                                })
                            }
                            placeholder={t('auth.token')}
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
