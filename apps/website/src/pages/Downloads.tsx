import { Helmet } from 'react-helmet-async';
import { Monitor, Apple, Terminal } from 'lucide-react';
import './Downloads.css';

export function Downloads() {
  const latestRelease = {
    version: "v2.0.0",
    date: "June 24, 2026",
    notesLink: "/release-notes"
  };

  const platforms = [
    {
      os: "macOS (Apple Silicon)",
      icon: Apple,
      arch: "arm64",
      filename: `Everest-${latestRelease.version}-arm64.dmg`,
      checksum: "sha256: 8a9b7c6d5e4f3g2h1i0j9k8l7m6n5o4p3q2r1s0t9u8v7w6x5y4z3a2b1c0d9e8f"
    },
    {
      os: "macOS (Intel)",
      icon: Apple,
      arch: "x64",
      filename: `Everest-${latestRelease.version}-x64.dmg`,
      checksum: "sha256: 1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
    },
    {
      os: "Windows",
      icon: Monitor,
      arch: "x64",
      filename: `Everest-${latestRelease.version}-setup.exe`,
      checksum: "sha256: f1e2d3c4b5a698765432101234567890abcdef1234567890abcdef12345678"
    },
    {
      os: "Linux",
      icon: Terminal,
      arch: "x64",
      filename: `Everest-${latestRelease.version}.AppImage`,
      checksum: "Coming Soon",
      disabled: true
    }
  ];

  return (
    <>
      <Helmet>
        <title>Download Everest - API Platform</title>
        <meta name="description" content="Download Everest for macOS, Windows, and Linux. The offline-first API testing platform." />
      </Helmet>

      <div className="container py-5 text-center">
        <h1 className="mb-2">Download Everest</h1>
        <p className="subtitle mb-5">
          Latest Release: <strong>{latestRelease.version}</strong> (Released on {latestRelease.date}) <br/>
          <a href={latestRelease.notesLink} className="text-accent">View Release Notes</a>
        </p>

        <div className="downloads-grid">
          {platforms.map((platform, idx) => (
            <div key={idx} className={`download-card card ${platform.disabled ? 'disabled' : ''}`}>
              <div className="download-icon">
                <platform.icon size={48} />
              </div>
              <h3 className="download-os">{platform.os}</h3>
              <p className="download-arch">Architecture: {platform.arch}</p>
              
              <button className="btn btn-primary btn-full mt-4" disabled={platform.disabled}>
                {platform.disabled ? 'Coming Soon' : 'Download'}
              </button>
              
              {!platform.disabled && (
                <div className="download-meta">
                  <span className="filename">{platform.filename}</span>
                  <div className="checksum" title={platform.checksum}>
                    {platform.checksum.substring(0, 20)}...
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
