import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, Code, Menu, X, Mountain } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useState } from 'react';
import './Navbar.css';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Features', path: '/features' },
    { name: 'Documentation', path: '/docs' },
    { name: 'Getting Started', path: '/getting-started' },
    { name: 'Downloads', path: '/downloads' },
    { name: 'Roadmap', path: '/roadmap' },
  ];

  return (
    <nav className="navbar glass">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <Mountain className="logo-icon" />
          <span>Everest</span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links desktop-only">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="navbar-actions desktop-only">
          <a href="https://github.com/aghilpadash/postman" target="_blank" rel="noreferrer" className="icon-btn">
            <Code size={20} />
          </a>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="icon-btn"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/downloads" className="btn btn-primary btn-sm">
            Download
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="mobile-only">
          <button
            className="icon-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <div className="mobile-actions">
            <button
              onClick={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark');
                setIsMobileMenuOpen(false);
              }}
              className="mobile-nav-link"
            >
              Toggle {theme === 'dark' ? 'Light' : 'Dark'} Theme
            </button>
            <Link to="/downloads" className="btn btn-primary" onClick={() => setIsMobileMenuOpen(false)}>
              Download Everest
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
