import React from 'react';
import { version } from '../../../../package.json';

interface AboutDialogProps {
    onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 9999
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                backgroundColor: 'var(--bg-surface)', padding: '2rem', borderRadius: '12px',
                width: '450px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                display: 'flex', flexDirection: 'column', gap: '1rem',
                border: '1px solid var(--border-color)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Everest</h2>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: '1.2rem'
                    }}>✕</button>
                </div>
                
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Version: {version}
                </div>

                <p style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    Everest is a desktop API testing platform designed for local development, automation, debugging, environment management, and collection-based testing workflows.
                </p>

                <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Built using:</strong>
                    <ul style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
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
                    <strong style={{ color: 'var(--text-primary)' }}>Features:</strong>
                    <ul style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', paddingLeft: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
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
                    marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)',
                    textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem'
                }}>
                    Made with ❤️ and JavaScript
                </div>
            </div>
        </div>
    );
};
