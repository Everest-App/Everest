import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronRight, Menu, X } from 'lucide-react';
import './Documentation.css';

const docSections = [
  {
    title: "Getting Started",
    links: ["Introduction", "Installation", "Quick Start"]
  },
  {
    title: "Core Concepts",
    links: ["Creating Requests", "Working with Collections", "Environments & Variables"]
  },
  {
    title: "Advanced",
    links: ["Runner & CSV Runner", "Pre-request Scripts", "Test Scripts", "Code Snippets"]
  },
  {
    title: "Import & Export",
    links: ["Importing cURL", "Importing Collections", "Exporting Data"]
  },
  {
    title: "Help",
    links: ["Troubleshooting", "FAQ"]
  }
];

export function Documentation() {
  const [activeDoc, setActiveDoc] = useState("Introduction");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>Documentation - Everest API Platform</title>
        <meta name="description" content="Learn how to use Everest for API testing, automation, and documentation." />
      </Helmet>
      
      <div className="docs-layout">
        {/* Mobile Sidebar Toggle */}
        <div className="docs-mobile-header">
          <button className="icon-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span>{activeDoc}</span>
        </div>

        {/* Sidebar */}
        <aside className={`docs-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="docs-search">
            <input type="text" placeholder="Search docs..." className="search-input" />
          </div>
          
          <nav className="docs-nav">
            {docSections.map((section, idx) => (
              <div key={idx} className="docs-nav-section">
                <h4 className="docs-nav-title">{section.title}</h4>
                <ul className="docs-nav-list">
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <button 
                        className={`docs-nav-link ${activeDoc === link ? 'active' : ''}`}
                        onClick={() => {
                          setActiveDoc(link);
                          setSidebarOpen(false);
                        }}
                      >
                        {link}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="docs-content">
          <div className="docs-breadcrumb">
            Documentation <ChevronRight size={14} /> {activeDoc}
          </div>
          
          <article className="prose">
            <h1>{activeDoc}</h1>
            <p className="lead">
              Welcome to the documentation for {activeDoc}. This is placeholder content that explains how to use this feature in Everest.
            </p>
            
            <h2>Overview</h2>
            <p>
              Everest is designed to be intuitive and powerful. To get the most out of {activeDoc}, follow these best practices.
            </p>
            
            <div className="callout info">
              <strong>Pro Tip:</strong> You can use keyboard shortcuts to speed up your workflow when working with {activeDoc}.
            </div>
            
            <h2>Example Configuration</h2>
            <pre className="code-block">
              <code>
{`{
  "name": "Everest API",
  "version": "1.0.0",
  "feature": "${activeDoc.toLowerCase().replace(/ /g, '-')}"
}`}
              </code>
            </pre>
            
            <h2>Next Steps</h2>
            <p>
              Once you have mastered {activeDoc}, you might want to explore the advanced capabilities available in the Runner section.
            </p>
          </article>
        </main>
      </div>
    </>
  );
}
