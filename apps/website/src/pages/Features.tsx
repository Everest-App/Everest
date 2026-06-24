import { Helmet } from 'react-helmet-async';
import { Folder, Database, Play, Code, Search, Clock, FileText, SunMoon, Layers, Box, FileSpreadsheet, TerminalSquare, Copy, BarChart } from 'lucide-react';
import './Features.css';

export function Features() {
  const featureGroups = [
    {
      title: "Organization",
      items: [
        { icon: Folder, name: "Collections & Folders", desc: "Organize requests logically into folders and collections. Group endpoints by domain or business logic." },
        { icon: Layers, name: "Environments", desc: "Easily switch between different contexts like Local, Staging, and Production without changing request URLs." },
        { icon: Database, name: "Variables", desc: "Use variables at the collection or environment level to keep your requests dynamic and reusable." }
      ]
    },
    {
      title: "Automation & Testing",
      items: [
        { icon: Play, name: "Collection Runner", desc: "Run a sequence of requests with a single click. Ideal for automated testing and CI/CD workflows." },
        { icon: FileSpreadsheet, name: "CSV Runner", desc: "Data-driven testing made simple. Run collections iteratively using data from CSV files." },
        { icon: TerminalSquare, name: "Pre-request Scripts", desc: "Write JavaScript to execute logic before a request is sent. Great for generating auth tokens." },
        { icon: Code, name: "Test Scripts", desc: "Write assertions using modern JavaScript syntax to validate API responses and status codes." }
      ]
    },
    {
      title: "Productivity",
      items: [
        { icon: Copy, name: "Code Snippets", desc: "Automatically generate code snippets for your requests in multiple languages (Python, Go, Node, etc.)." },
        { icon: Box, name: "cURL Import", desc: "Instantly create requests by pasting cURL commands directly into the application." },
        { icon: Search, name: "Global Search", desc: "Find any request, variable, or collection instantly with our lightning-fast global search." },
        { icon: Clock, name: "Request History", desc: "Never lose a request again. Access a complete history of all your API calls." }
      ]
    },
    {
      title: "Insights & Customization",
      items: [
        { icon: BarChart, name: "Reports", desc: "Visualize test results and API performance with beautiful, easy-to-read reports." },
        { icon: FileText, name: "API Documentation", desc: "Generate and view documentation for your collections right within the app." },
        { icon: SunMoon, name: "Theme Support", desc: "Beautiful light and dark modes designed to be easy on the eyes during long coding sessions." }
      ]
    }
  ];

  return (
    <>
      <Helmet>
        <title>Features - Everest API Platform</title>
        <meta name="description" content="Explore the powerful features of Everest, from Collections and Environments to the CSV Runner and pre-request scripts." />
      </Helmet>
      
      <div className="page-header">
        <div className="container text-center">
          <h1>Features</h1>
          <p className="subtitle">Everything you need to build, test, and document APIs efficiently.</p>
        </div>
      </div>

      <div className="container py-4">
        {featureGroups.map((group, idx) => (
          <section key={idx} className="feature-group">
            <h2 className="feature-group-title">{group.title}</h2>
            <div className="features-grid">
              {group.items.map((feature, fIdx) => (
                <div key={fIdx} className="feature-card card">
                  <div className="feature-icon"><feature.icon size={24} /></div>
                  <h3 className="feature-title">{feature.name}</h3>
                  <p className="feature-desc">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
