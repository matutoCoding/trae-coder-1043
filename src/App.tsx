import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import VaccineLedger from './pages/VaccineLedger'
import StockInOut from './pages/StockInOut'
import ColdChainTransport from './pages/ColdChainTransport'
import TemperatureMonitor from './pages/TemperatureMonitor'
import VaccinationDistribution from './pages/VaccinationDistribution'
import ExpiryWarning from './pages/ExpiryWarning'
import TraceStatistics from './pages/TraceStatistics'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vaccine-ledger" element={<VaccineLedger />} />
        <Route path="stock-in-out" element={<StockInOut />} />
        <Route path="cold-chain-transport" element={<ColdChainTransport />} />
        <Route path="temperature-monitor" element={<TemperatureMonitor />} />
        <Route path="vaccination-distribution" element={<VaccinationDistribution />} />
        <Route path="expiry-warning" element={<ExpiryWarning />} />
        <Route path="trace-statistics" element={<TraceStatistics />} />
      </Route>
    </Routes>
  )
}
