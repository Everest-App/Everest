import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Download, Book, Code, Server, Lock, WifiOff, Layers, Zap } from 'lucide-react';
import './Home.css';

export function Home() {
  return (
    <>
      <Helmet>
        <title>Everest - Every REST API. One Powerful Desktop Platform.</title>
        <meta name="description" content="Everest is a secure, offline-first API testing platform built for developers, QA engineers, and enterprise teams." />
      </Helmet>
      
      <div className="home">
        {/* Background Gradients */}
        <div className="bg-gradient-glow"></div>
        
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <h1 className="hero-title">
              Every REST API.<br />
              <span className="text-gradient">One Powerful Desktop Platform.</span>
            </h1>
            <p className="hero-subtitle">
              A secure, offline-first API testing platform built for developers, QA engineers, and enterprise teams.
            </p>
            <div className="hero-actions">
              <Link to="/downloads" className="btn btn-primary btn-lg">
                <Download size={20} />
                Download Everest
              </Link>
              <Link to="/docs" className="btn btn-secondary btn-lg">
                <Book size={20} />
                View Documentation
              </Link>
              <a href="https://github.com/aghilpadash/postman" target="_blank" rel="noreferrer" className="btn btn-outline btn-lg">
                <Code size={20} />
                GitHub Repository
              </a>
            </div>
            
            {/* Mockup / Dashboard Preview (Placeholder for now) */}
            <div className="hero-mockup card glass">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <div className="mockup-url">everest-workspace</div>
              </div>
              <div className="mockup-body">
                <div className="mockup-sidebar">
                  <div className="skeleton-line short"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line"></div>
                  <div className="skeleton-line short"></div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-request">
                    <span className="method get">GET</span>
                    <span className="url">https://api.example.com/v1/users</span>
                    <button className="btn btn-primary btn-sm">Send</button>
                  </div>
                  <div className="mockup-response">
                    <div className="skeleton-block"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section */}
        <section className="features-section">
          <div className="container">
            <h2 className="section-title">Everything you need to test APIs</h2>
            <div className="features-grid">
              {[
                { icon: Server, title: "REST API Testing", desc: "Craft complex requests with intuitive UI." },
                { icon: Zap, title: "WebSocket Testing", desc: "Real-time, bi-directional communication." },
                { icon: Layers, title: "GraphQL Support", desc: "Schema introspection and auto-completion." },
                { icon: Code, title: "Environment Management", desc: "Easily switch between Dev, Staging, and Prod." },
                { icon: Book, title: "Collection Runner", desc: "Automate and run entire API workflows." },
                { icon: Download, title: "CSV Data Iteration", desc: "Data-driven testing made simple." }
              ].map((feature, i) => (
                <div key={i} className="feature-card card">
                  <div className="feature-icon"><feature.icon size={24} /></div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-desc">{feature.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
               <Link to="/features" className="btn btn-secondary">View all features</Link>
            </div>
          </div>
        </section>

        {/* Why Everest Section */}
        <section className="why-section">
          <div className="container">
            <h2 className="section-title">Why Everest?</h2>
            <div className="why-grid">
              <div className="why-item">
                <Lock className="why-icon" size={32} />
                <h3>Security First</h3>
                <p>Your API keys, tokens, and data never leave your machine unless you explicitly sync them.</p>
              </div>
              <div className="why-item">
                <WifiOff className="why-icon" size={32} />
                <h3>Offline First</h3>
                <p>Test local and internal APIs without requiring an internet connection or cloud account.</p>
              </div>
              <div className="why-item">
                <Server className="why-icon" size={32} />
                <h3>No SaaS Dependency</h3>
                <p>Everest runs locally. You own your data, with no mandatory cloud subscriptions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Overview */}
        <section className="architecture-section">
          <div className="container">
            <h2 className="section-title">Architecture Overview</h2>
            <div className="architecture-diagram card">
               <div className="arch-node">
                 <h4>Desktop App</h4>
                 <p>React + Vite</p>
               </div>
               <div className="arch-arrow">↓</div>
               <div className="arch-node highlight">
                 <h4>Runtime Engine</h4>
                 <p>High-performance core</p>
               </div>
               <div className="arch-arrow">↓</div>
               <div className="arch-node">
                 <h4>API Services</h4>
                 <p>Target endpoints</p>
               </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
