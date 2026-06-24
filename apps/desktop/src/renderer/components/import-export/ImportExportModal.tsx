import React, { useState } from 'react';
import { useCollectionStore } from '../../store/collection-store';
import { ImportFormat, ExportFormat } from '@api-platform/core';
import { ImportNameModal } from '../common/ImportNameModal';

interface ImportExportModalProps {
    onClose: () => void;
}

export function ImportExportModal({ onClose }: ImportExportModalProps) {
    const [mode, setMode] = useState<'import' | 'export'>('import');
    const [importText, setImportText] = useState('');
    const [importFormat, setImportFormat] = useState<ImportFormat>('postman-v2.1');
    const [exportFormat, setExportFormat] = useState<ExportFormat>('postman-v2.1');
    const [selectedCollectionId, setSelectedCollectionId] = useState('');
    const [result, setResult] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { collections, fetchCollections } = useCollectionStore();

    // Name modal state
    const [showNameModal, setShowNameModal] = useState(false);
    const [pendingImportSource, setPendingImportSource] = useState<'text' | 'file' | null>(null);
    const [pendingFileContent, setPendingFileContent] = useState<string>('');
    const [pendingFileFormat, setPendingFileFormat] = useState<ImportFormat>('postman-v2.1');
    const [suggestedName, setSuggestedName] = useState('');

    // Derive a suggested name from import text
    const deriveName = (content: string, format: ImportFormat): string => {
        if (format === 'curl') {
            // Try to extract method + URL path
            const methodMatch = content.match(/-X\s+(\w+)/i);
            const urlMatch = content.match(/(?:^|\s)(https?:\/\/[^\s'"]+)/i) || content.match(/(?:^|\s)([^\s'"]+\.[^\s'"]+)/i);
            if (urlMatch) {
                try {
                    const url = new URL(urlMatch[1].startsWith('http') ? urlMatch[1] : `http://${urlMatch[1]}`);
                    const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
                    return `${method} ${url.pathname}`;
                } catch { /* ignore */ }
            }
            return 'cURL Import';
        }
        try {
            const parsed = JSON.parse(content);
            if (parsed.info?.name) return parsed.info.name;
            if (parsed.info?.title) return parsed.info.title;
            if (parsed.name) return parsed.name;
            return 'Imported Collection';
        } catch {
            return 'Imported Collection';
        }
    };

    const handleImportText = async () => {
        if (!importText.trim()) return;
        const name = deriveName(importText, importFormat);
        setSuggestedName(name);
        setPendingImportSource('text');
        setShowNameModal(true);
    };

    const handleImportFile = async () => {
        setLoading(true);
        setError('');
        try {
            // For file import, we use the IPC importFile which returns the result
            // But we need to get the file content first to derive the name
            const res = await window.api.importFile();
            if (res.success) {
                setResult(`✅ Imported collection: ${res.collection?.name || 'Unknown'}`);
                fetchCollections();
            } else {
                setError(`❌ ${res.errors?.join(', ') || 'Import failed or cancelled'}`);
            }
        } catch (err: any) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleNameConfirm = async (customName: string) => {
        setShowNameModal(false);
        setLoading(true);
        setError('');
        try {
            if (pendingImportSource === 'text') {
                const res = await window.api.importData(importText, importFormat, customName);
                if (res.success) {
                    setResult(`✅ Imported collection: ${res.collection?.name || customName}`);
                    fetchCollections();
                } else {
                    setError(`❌ ${res.errors?.join(', ') || 'Import failed'}`);
                }
            }
        } catch (err: any) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
            setPendingImportSource(null);
        }
    };

    const handleNameCancel = () => {
        setShowNameModal(false);
        setPendingImportSource(null);
    };

    const handleExport = async () => {
        if (!selectedCollectionId) return;
        setLoading(true);
        setError('');
        try {
            const data = await window.api.exportCollection(selectedCollectionId, exportFormat);
            setResult(data);
        } catch (err: any) {
            setError(`❌ ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyResult = async () => {
        try {
            await navigator.clipboard.writeText(result);
        } catch { /* ignore */ }
    };

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    // Show import name modal
    if (showNameModal) {
        return (
            <ImportNameModal
                title="Enter Collection Name"
                subtitle="Choose a name for the imported collection"
                defaultName={suggestedName}
                onConfirm={handleNameConfirm}
                onCancel={handleNameCancel}
            />
        );
    }

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal" style={{ width: 650 }}>
                <div className="modal-header">
                    <span className="modal-title">Import / Export</span>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {/* Mode Toggle */}
                    <div className="body-type-selector" style={{ marginBottom: 16 }}>
                        <button className={`body-type-btn ${mode === 'import' ? 'active' : ''}`} onClick={() => setMode('import')}>Import</button>
                        <button className={`body-type-btn ${mode === 'export' ? 'active' : ''}`} onClick={() => setMode('export')}>Export</button>
                    </div>

                    {mode === 'import' && (
                        <div>
                            {/* Format selector */}
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Format</label>
                                <div className="body-type-selector" style={{ marginTop: 4 }}>
                                    <button className={`body-type-btn ${importFormat === 'postman-v2.1' ? 'active' : ''}`} onClick={() => setImportFormat('postman-v2.1')}>Postman v2.1</button>
                                    <button className={`body-type-btn ${importFormat === 'openapi' ? 'active' : ''}`} onClick={() => setImportFormat('openapi')}>OpenAPI</button>
                                    <button className={`body-type-btn ${importFormat === 'curl' ? 'active' : ''}`} onClick={() => setImportFormat('curl')}>cURL</button>
                                </div>
                            </div>

                            {/* Import from file */}
                            <button className="send-btn" style={{ marginBottom: 12, width: '100%' }} onClick={handleImportFile} disabled={loading}>
                                {loading ? 'Importing...' : '📂 Import from File'}
                            </button>

                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11, margin: '8px 0' }}>— or paste content below —</div>

                            {/* Paste text */}
                            <textarea
                                className="body-textarea"
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                placeholder={importFormat === 'curl'
                                    ? "curl -X GET 'https://api.example.com/data' -H 'Authorization: Bearer token'"
                                    : 'Paste JSON content here...'}
                                style={{ minHeight: 150 }}
                            />

                            <button className="send-btn" style={{ marginTop: 8, width: '100%' }} onClick={handleImportText} disabled={loading || !importText.trim()}>
                                {loading ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    )}

                    {mode === 'export' && (
                        <div>
                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collection</label>
                                <select
                                    value={selectedCollectionId}
                                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                                    style={{
                                        display: 'block', width: '100%', padding: '6px 8px', fontSize: 12, marginTop: 4,
                                        fontFamily: 'var(--font-sans)', background: 'var(--bg-input)',
                                        border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)', outline: 'none',
                                    }}
                                >
                                    <option value="">Select a collection...</option>
                                    {collections.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Format</label>
                                <div className="body-type-selector" style={{ marginTop: 4 }}>
                                    <button className={`body-type-btn ${exportFormat === 'postman-v2.1' ? 'active' : ''}`} onClick={() => setExportFormat('postman-v2.1')}>Postman v2.1</button>
                                    <button className={`body-type-btn ${exportFormat === 'json' ? 'active' : ''}`} onClick={() => setExportFormat('json')}>Raw JSON</button>
                                </div>
                            </div>

                            <button className="send-btn" style={{ width: '100%' }} onClick={handleExport} disabled={loading || !selectedCollectionId}>
                                {loading ? 'Exporting...' : 'Export'}
                            </button>
                        </div>
                    )}

                    {/* Result / Error */}
                    {error && <div style={{ marginTop: 12, padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--method-delete)', fontSize: 12 }}>{error}</div>}
                    {result && (
                        <div className="code-output" style={{ marginTop: 12 }}>
                            <button className="copy-btn" onClick={handleCopyResult}>Copy</button>
                            <pre style={{ maxHeight: 200, overflow: 'auto' }}>{result}</pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
