import MonitoringDashboard from '@/components/MonitoringDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function MonitoringPage() {
  return (
    <ErrorBoundary>
      <MonitoringDashboard />
    </ErrorBoundary>
  );
} 