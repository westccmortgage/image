import { Navigate, Route, Routes } from 'react-router-dom';
import { AdvisorPage } from './pages/AdvisorPage';
import { EmbedPage } from './pages/EmbedPage';
import { StrategyPage } from './pages/StrategyPage';

/**
 * Wallet WCCM standalone site routes.
 *   /        → full AI Cash-to-Close Advisor
 *   /embed   → compact embeddable widget
 * Legacy aliases keep the module's documented tool routes working.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<AdvisorPage />} />
      <Route path="/strategy" element={<StrategyPage />} />
      <Route path="/embed" element={<EmbedPage />} />
      <Route path="/tools/cash-to-close" element={<AdvisorPage />} />
      <Route path="/calculators/cash-to-close" element={<AdvisorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
