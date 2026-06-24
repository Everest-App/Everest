import { Link } from 'react-router-dom';
import { Mountain } from 'lucide-react';
import './Footer.css';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="footer-logo">
              <Mountain className="logo-icon" />
              <span>Everest</span>
            </Link>
            <p className="footer-description">
              A secure, offline-first API testing platform built for developers, QA engineers, and enterprise teams.
            </p>
          </div>
          
          <div className="footer-links">
            <h4 className="footer-title">Product</h4>
            <ul>
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/downloads">Downloads</Link></li>
              <li><Link to="/roadmap">Roadmap</Link></li>
              <li><Link to="/release-notes">Release Notes</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4 className="footer-title">Resources</h4>
            <ul>
              <li><Link to="/docs">Documentation</Link></li>
              <li><Link to="/getting-started">Getting Started</Link></li>
              <li><a href="https://github.com/aghilpadash/postman" target="_blank" rel="noreferrer">GitHub</a></li>
              <li><Link to="/about">About</Link></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4 className="footer-title">Legal</h4>
            <ul>
              <li><a href="https://github.com/aghilpadash/postman/blob/main/LICENSE" target="_blank" rel="noreferrer">License</a></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; {currentYear} Everest API Platform. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
