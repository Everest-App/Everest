import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UrlBar } from './UrlBar';
import { ParamsEditor } from './ParamsEditor';
import { HeadersEditor } from './HeadersEditor';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';
import { CodeGenModal } from '../codegen/CodeGenModal';
import { ScriptEditor } from '../scripts/ScriptEditor';
import { ImportCurlModal } from '../import-curl/ImportCurlModal';
import { useTabStore } from '../../store/tab-store';
import { appEvents, NAVIGATE_TO_VARIABLE } from '../../utils/event-bus';

type ConfigTab = 'params' | 'headers' | 'body' | 'auth' | 'pre-request' | 'tests';

export function RequestPanel() {
    const { t } = useTranslation();
    const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>('params');
    const [codeGenOpen, setCodeGenOpen] = useState(false);
    const [curlImportOpen, setCurlImportOpen] = useState(false);
    const [curlInitialValue, setCurlInitialValue] = useState<string | undefined>();
    const { tabs, activeTabId, updatePreRequestScript, updateTestScript } = useTabStore();

    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return null;

    const { request } = activeTab;
    const paramCount = request.params.filter((p) => p.enabled && p.key).length;
    const headerCount = request.headers.filter((h) => h.enabled && h.key).length;

    const handleImportCurl = (curlText?: string) => {
        setCurlInitialValue(curlText);
        setCurlImportOpen(true);
    };

    const handleNavigateToVariable = useCallback((varName: string) => {
        appEvents.emit(NAVIGATE_TO_VARIABLE, varName);
    }, []);

    return (
        <div className="request-panel">
            <UrlBar
                onCodeGen={() => setCodeGenOpen(true)}
                onImportCurl={handleImportCurl}
                onNavigateToVariable={handleNavigateToVariable}
            />

            <div className="config-tabs">
                <button className={`config-tab ${activeConfigTab === 'params' ? 'active' : ''}`}
                    onClick={() => setActiveConfigTab('params')}>
                    {t('request.params')}{paramCount > 0 && <span className="badge">{paramCount}</span>}
                </button>
                <button className={`config-tab ${activeConfigTab === 'headers' ? 'active' : ''}`}
                    onClick={() => setActiveConfigTab('headers')}>
                    {t('request.headers')}{headerCount > 0 && <span className="badge">{headerCount}</span>}
                </button>
                <button className={`config-tab ${activeConfigTab === 'body' ? 'active' : ''}`}
                    onClick={() => setActiveConfigTab('body')}>
                    {t('request.body')}
                </button>
                <button className={`config-tab ${activeConfigTab === 'auth' ? 'active' : ''}`}
                    onClick={() => setActiveConfigTab('auth')}>
                    {t('request.auth')}
                </button>
                <button className={`config-tab ${activeConfigTab === 'pre-request' ? 'active' : ''}`}
                    onClick={() => setActiveConfigTab('pre-request')}>
                    {t('request.preRequest')}{request.preRequestScript ? <span className="badge">•</span> : null}
                </button>
                <button className={`config-tab ${activeConfigTab === 'tests' ? 'active' : ''}`}
                    onClick={() => setActiveConfigTab('tests')}>
                    {t('request.tests')}{request.testScript ? <span className="badge">•</span> : null}
                </button>
            </div>

            <div className="config-panel">
                {activeConfigTab === 'params' && <ParamsEditor />}
                {activeConfigTab === 'headers' && <HeadersEditor />}
                {activeConfigTab === 'body' && <BodyEditor />}
                {activeConfigTab === 'auth' && <AuthEditor />}
                {activeConfigTab === 'pre-request' && (
                    <ScriptEditor
                        label={t('scripts.preRequestScript')}
                        value={request.preRequestScript || ''}
                        onChange={(val) => updatePreRequestScript(val)}
                        placeholder={t('scripts.preRequestPlaceholder')}
                    />
                )}
                {activeConfigTab === 'tests' && (
                    <ScriptEditor
                        label={t('scripts.testScript')}
                        value={request.testScript || ''}
                        onChange={(val) => updateTestScript(val)}
                        placeholder={t('scripts.testPlaceholder')}
                    />
                )}
            </div>

            {codeGenOpen && <CodeGenModal onClose={() => setCodeGenOpen(false)} />}
            {curlImportOpen && (
                <ImportCurlModal
                    onClose={() => { setCurlImportOpen(false); setCurlInitialValue(undefined); }}
                    initialValue={curlInitialValue}
                />
            )}
        </div>
    );
}
