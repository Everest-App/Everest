import React from 'react';
import { SFIcon } from './SFIcon';
import { version } from '../../../../package.json';

interface AboutDialogProps {
    onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-elevated)',
                padding: '24px',
                borderRadius: 'var(--radius-xl)',
                width: '450px',
                border: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                color: 'var(--text-primary)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Everest</h2>
                    <button className="toolbar-btn" onClick={onClose} style={{ padding: 4 }}>
                        <SFIcon name="xmark" size={14} />
                    </button>
                </div>
                
                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                    Version: {version}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                    Everest is a desktop API testing platform designed for local development, automation, debugging, environment management, and collection-based testing workflows.
                </p>

                <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Built using:</strong>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', paddingLeft: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <li>Electron.js</li>
                        <li>React</li>
                        <li>TypeScript</li>
                        <li>Node.js</li>
                        <li>Vite</li>
                        <li>SQLite</li>
                        <li>Monaco Editor</li>
                    </ul>
                </div>

                <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>Features:</strong>
                    <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '6px', paddingLeft: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                        <li>API Testing</li>
                        <li>Collections</li>
                        <li>Environments</li>
                        <li>Runner</li>
                        <li>CSV Iterations</li>
                        <li>Script Engine</li>
                        <li>Code Snippets</li>
                        <li>Local Storage</li>
                    </ul>
                </div>

                <div style={{ 
                    marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-primary)',
                    textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem'
                }}>
                    Made with ❤️ and JavaScript
                </div>
            </div>
        </div>
    );
};
