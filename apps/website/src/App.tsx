import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './layouts/Layout';

// Pages
import { Home } from './pages/Home';
import { Features } from './pages/Features';
import { Documentation } from './pages/Documentation';
import { GettingStarted } from './pages/GettingStarted';
import { Downloads } from './pages/Downloads';
import { Roadmap } from './pages/Roadmap';
import { ReleaseNotes } from './pages/ReleaseNotes';
import { About } from './pages/About';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="docs" element={<Documentation />} />
          <Route path="getting-started" element={<GettingStarted />} />
          <Route path="downloads" element={<Downloads />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="release-notes" element={<ReleaseNotes />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
