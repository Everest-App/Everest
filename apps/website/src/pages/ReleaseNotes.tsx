import { Helmet } from 'react-helmet-async';
import './ReleaseNotes.css';

export function ReleaseNotes() {
  const releases = [
    {
      version: "v2.0.0",
      date: "June 24, 2026",
      features: [
        "New Runtime Engine: Completely rewritten for 10x faster request execution.",
        "CSV Runner: Run collections iteratively using data from CSV files.",
        "Global Search support: Find any request, variable, or environment instantly."
      ],
      improvements: [
        "Collection Improvements: Drag and drop support for reordering requests.",
        "Enhanced dark mode contrast for better readability.",
        "Reduced memory footprint by 40%."
      ],
      fixes: [
        "Fixed an issue where WebSocket connections would drop after 5 minutes.",
        "Resolved UI glitch when importing large Postman collections.",
        "Fixed environment variables not resolving in pre-request scripts."
      ]
    },
    {
      version: "v1.5.0",
      date: "March 12, 2026",
      features: [
        "GraphQL Support: Autocomplete and schema fetching.",
        "Code Snippets: Generate code for Python, Go, Node, and Rust."
      ],
      improvements: [
        "Added support for custom SSL certificates.",
        "Improved response body syntax highlighting."
      ],
      fixes: [
        "Fixed layout issues on Windows when scaled to 150%."
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Release Notes - Everest API Platform</title>
        <meta name="description" content="Read about the latest updates, new features, and bug fixes in Everest." />
      </Helmet>

      <div className="container py-5" style={{ maxWidth: '800px' }}>
        <h1 className="mb-2 text-center">Release Notes</h1>
        <p className="subtitle text-center mb-5">Discover what's new in Everest.</p>

        <div className="releases-list">
          {releases.map((release, idx) => (
            <div key={idx} className="release-card card">
              <div className="release-header">
                <h2>{release.version}</h2>
                <span className="release-date">{release.date}</span>
              </div>
              
              <div className="release-content">
                {release.features.length > 0 && (
                  <div className="release-section">
                    <h4 className="text-accent">🚀 New Features</h4>
                    <ul>
                      {release.features.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                
                {release.improvements.length > 0 && (
                  <div className="release-section">
                    <h4 className="text-info">✨ Improvements</h4>
                    <ul>
                      {release.improvements.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                
                {release.fixes.length > 0 && (
                  <div className="release-section">
                    <h4 className="text-warning">🐛 Bug Fixes</h4>
                    <ul>
                      {release.fixes.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
