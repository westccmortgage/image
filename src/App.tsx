import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CashToClosePage } from './pages/CashToClosePage';

/**
 * Demo router. In a host site these routes would live inside that site's own
 * router. The advisor is mounted at both /tools/cash-to-close and
 * /calculators/cash-to-close per the module spec.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/tools/cash-to-close" element={<CashToClosePage />} />
      <Route path="/calculators/cash-to-close" element={<CashToClosePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
