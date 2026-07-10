import { Navigate, Route, Routes } from 'react-router-dom';
import { SmartPage } from './pages/SmartPage';
import { EmbedPage } from './pages/EmbedPage';

/**
 * Wallet WCCM — one unified smart site.
 *   /        → the AI Cash-to-Close engine (console + live numbers + intake)
 *   /embed   → compact embeddable widget
 * Legacy paths redirect into the unified experience.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<SmartPage />} />
      <Route path="/strategy" element={<SmartPage />} />
      <Route path="/tools/cash-to-close" element={<SmartPage />} />
      <Route path="/calculators/cash-to-close" element={<SmartPage />} />
      <Route path="/embed" element={<EmbedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
