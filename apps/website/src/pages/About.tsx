import { Helmet } from 'react-helmet-async';
import './About.css';

export function About() {
  return (
    <>
      <Helmet>
        <title>About - Everest API Platform</title>
        <meta name="description" content="Learn about the mission behind Everest, the secure, offline-first API testing platform." />
      </Helmet>

      <div className="container py-5" style={{ maxWidth: '800px' }}>
        <h1 className="mb-5 text-center">About Everest</h1>
        
        <div className="about-content">
          <section className="about-section">
            <h2>What is Everest?</h2>
            <p>
              Everest (Ever + REST = Every REST API) is a modern desktop API testing platform designed from the ground up for secure, offline-first, and enterprise environments.
            </p>
            <p>
              It provides a comprehensive suite of tools for developers and QA engineers to design, test, and document APIs efficiently without relying on mandatory cloud services.
            </p>
          </section>

          <section className="about-section">
            <h2>Why was it created?</h2>
            <p>
              The API testing landscape has increasingly moved towards cloud-only, SaaS-dependent models. While convenient for some, this approach poses significant challenges for:
            </p>
            <ul>
              <li><strong>Enterprise Teams:</strong> Dealing with strict data privacy and compliance requirements.</li>
              <li><strong>Developers:</strong> Working in air-gapped or low-connectivity environments.</li>
              <li><strong>Individuals:</strong> Who simply want a fast, native tool without account sign-ups or subscription fees.</li>
            </ul>
            <p>
              Everest was created to solve these problems by providing a powerful, extensible tool that respects your privacy and data ownership. Your API keys, tokens, and proprietary data stay on your machine.
            </p>
          </section>

          <section className="about-section">
            <h2>Who is it for?</h2>
            <p>
              Everest is built for anyone who works with APIs:
            </p>
            <ul>
              <li><strong>Backend Developers:</strong> Building and debugging REST and GraphQL endpoints.</li>
              <li><strong>Frontend Developers:</strong> Integrating and testing API responses.</li>
              <li><strong>QA Engineers:</strong> Creating automated test suites and data-driven tests.</li>
              <li><strong>Security Researchers:</strong> Inspecting payloads safely in an offline environment.</li>
            </ul>
          </section>

          <section className="about-section mission-section card glass">
            <h2>Our Mission</h2>
            <p className="mission-statement text-gradient">
              "To provide a secure, extensible, enterprise-grade API testing platform that empowers developers while respecting their data sovereignty."
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
