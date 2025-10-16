'use client';

import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Chip, Alert } from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  Warning, 
  Info,
  Speed,
  Memory
} from '@mui/icons-material';
import { fetchWithCorrelation } from '@/lib/fetchWithCorrelation';
import { useUserInfo } from '@/auth/UserProvider';
import { useKindeUser } from '@/auth/useKindeUser';

interface SystemStatus {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memory: {
    total: number;
    free: number;
    used: number;
    usedPercent: number;
  };
  cpu: {
    count: number;
    model: string;
    speed: number;
    loadAvg: number[];
  };
}

interface RequestStats {
  total: number;
  errors: number;
  avgResponseTime: number;
}

function parsePrometheusMetrics(metricsText: string, route: string = '/api/products') {
  const lines = metricsText.split('\n');
  let total = 0;
  let errors = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const line of lines) {
    if (line.startsWith('http_requests_total')) {
      // Only count the specified route
      const match = line.match(new RegExp(`http_requests_total\\{.*route="${route}".*status_code="(\\d+)".*\\} (\\d+)`));
      if (match) {
        const code = match[1];
        const value = parseInt(match[2], 10);
        total += value;
        if (parseInt(code, 10) >= 400) errors += value;
      }
    }
    if (line.startsWith('http_request_duration_seconds_sum')) {
      const match = line.match(new RegExp(`http_request_duration_seconds_sum\\{.*route="${route}".*\\} ([0-9.]+)`));
      if (match) durationSum += parseFloat(match[1]);
    }
    if (line.startsWith('http_request_duration_seconds_count')) {
      const match = line.match(new RegExp(`http_request_duration_seconds_count\\{.*route="${route}".*\\} (\\d+)`));
      if (match) durationCount += parseInt(match[1], 10);
    }
  }
  const avgResponseTime = durationCount > 0 ? (durationSum / durationCount) * 1000 : 0;
  return { total, errors, avgResponseTime };
}

const MonitoringDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [requestStats, setRequestStats] = useState<RequestStats>({ total: 0, errors: 0, avgResponseTime: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useUserInfo();
  const { session } = useKindeUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch system status
        const healthResponse = await fetchWithCorrelation('/api/health', {}, user, session);
        const healthData = await healthResponse.json();
        setSystemStatus(healthData);

        // Fetch Prometheus metrics
        const metricsResponse = await fetchWithCorrelation('/api/metrics', {}, user, session);
        const metricsText = await metricsResponse.text();
        setRequestStats(parsePrometheusMetrics(metricsText, '/api/products'));
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch monitoring data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user, session]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      default: return <Info color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading monitoring data...</Typography>
      </Box>
    );
  }

  if (error || !systemStatus) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error || 'No system status available'}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Monitoring Dashboard
      </Typography>

      {/* System Status */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 300px' }}>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              {getStatusIcon(systemStatus.status || 'unknown')}
              <Typography variant="h6" sx={{ ml: 1 }}>
                System Status
              </Typography>
            </Box>
            <Chip 
              label={systemStatus.status?.toUpperCase()} 
              color={getStatusColor(systemStatus.status || 'unknown')}
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Uptime: {formatUptime(systemStatus.uptime || 0)}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 300px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box display="flex" alignItems="center">
                <Speed sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    CPU Cores
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.cpu.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Load Avg
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.cpu.loadAvg.map((v) => v.toFixed(2)).join(', ')}
                  </Typography>
                </Box>
              </Box>
              <Box display="flex" alignItems="center">
                <Memory sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Memory Usage
                  </Typography>
                  <Typography variant="h6">
                    {systemStatus.memory.usedPercent}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Used / Total
                  </Typography>
                  <Typography variant="h6">
                    {Math.round(systemStatus.memory.used / 1024 / 1024)}MB / {Math.round(systemStatus.memory.total / 1024 / 1024)}MB
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Request Metrics */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 200px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Total Requests
            </Typography>
            <Typography variant="h4" color="primary">
              {requestStats.total.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Error Rate
            </Typography>
            <Typography variant="h4" color="error">
              {requestStats.total > 0 ? ((requestStats.errors / requestStats.total) * 100).toFixed(2) : '0.00'}%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Avg Response Time
            </Typography>
            <Typography variant="h4" color="primary">
              {requestStats.avgResponseTime.toFixed(0)}ms
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Chip 
              label="View Logs" 
              onClick={() => window.open('/api/logs', '_blank')}
              clickable
            />
            <Chip 
              label="View Metrics" 
              onClick={() => window.open('/api/metrics', '_blank')}
              clickable
            />
            <Chip 
              label="Health Check" 
              onClick={() => window.open('/api/health', '_blank')}
              clickable
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MonitoringDashboard; 