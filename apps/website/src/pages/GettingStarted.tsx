import { Helmet } from 'react-helmet-async';
import { Download, Globe, Play, FileCode, CheckCircle, Upload } from 'lucide-react';
import './GettingStarted.css';

export function GettingStarted() {
  const steps = [
    {
      icon: Download,
      title: "1. Install Everest",
      desc: "Download the appropriate binary for your operating system (macOS, Windows, or Linux) and install the application. No sign-up required."
    },
    {
      icon: Globe,
      title: "2. Create an Environment",
      desc: "Set up a new environment (e.g., 'Development') and define your base variables like BASE_URL to keep your requests DRY."
    },
    {
      icon: FileCode,
      title: "3. Create a Request",
      desc: "Click 'New Request', enter your endpoint URL, select the HTTP method, and configure any necessary headers or body payloads."
    },
    {
      icon: Play,
      title: "4. Run Request",
      desc: "Hit the 'Send' button. Everest will execute the request and display the response body, headers, status code, and latency in real-time."
    },
    {
      icon: CheckCircle,
      title: "5. Add Tests",
      desc: "Write simple JavaScript assertions in the 'Tests' tab to verify that your API returns the expected status code and data structure."
    },
    {
      icon: Upload,
      title: "6. Run Collections & Export",
      desc: "Group your requests into a Collection and use the Collection Runner to execute them sequentially. Export the results as a beautiful HTML report."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Getting Started - Everest API Platform</title>
        <meta name="description" content="A step-by-step guide to onboarding and running your first API request with Everest." />
      </Helmet>

      <div className="container py-5">
        <div className="text-center mb-5">
          <h1 className="mb-2">Getting Started</h1>
          <p className="subtitle">From zero to your first API request in minutes.</p>
        </div>

        <div className="timeline">
          {steps.map((step, idx) => (
            <div key={idx} className="timeline-item">
              <div className="timeline-icon">
                <step.icon size={24} />
              </div>
              <div className="timeline-content card">
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
