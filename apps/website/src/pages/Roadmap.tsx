import { Helmet } from 'react-helmet-async';
import './Roadmap.css';

export function Roadmap() {
  const roadmapData = [
    {
      phase: "Now",
      status: "in-progress",
      description: "Features we are actively working on.",
      items: [
        "OAuth 2.0 full flow support",
        "GraphQL introspection improvements",
        "Performance optimization for large payloads"
      ]
    },
    {
      phase: "Next",
      status: "planned",
      description: "Coming in the next few months.",
      items: [
        "gRPC Support",
        "WebSocket Enhancements (Socket.io, SignalR)",
        "Team Workspaces (Local network sync)"
      ]
    },
    {
      phase: "Future",
      status: "idea",
      description: "Long-term vision for Everest.",
      items: [
        "End-to-End Encrypted Cloud Sync (Optional)",
        "AI Assistant for request generation",
        "Plugin Ecosystem and Marketplace",
        "Load testing capabilities"
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Roadmap - Everest API Platform</title>
        <meta name="description" content="Explore the future of Everest. See what features are coming next, including gRPC, OAuth, and Team Workspaces." />
      </Helmet>

      <div className="container py-5 text-center" style={{ maxWidth: '900px' }}>
        <h1 className="mb-2">Roadmap</h1>
        <p className="subtitle mb-5">See where Everest is heading and what we're building next.</p>

        <div className="roadmap-grid">
          {roadmapData.map((phase, idx) => (
            <div key={idx} className={`roadmap-card card phase-${phase.status}`}>
              <div className="roadmap-header">
                <h2>{phase.phase}</h2>
                <div className={`status-badge ${phase.status}`}>
                  {phase.status.replace('-', ' ').toUpperCase()}
                </div>
              </div>
              <p className="roadmap-desc">{phase.description}</p>
              
              <ul className="roadmap-items">
                {phase.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
