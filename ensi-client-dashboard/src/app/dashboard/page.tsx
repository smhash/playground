import { Typography, Paper, Box } from '@mui/material';

export default function DashboardPage() {
  return (
    <div>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, flex: 1, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            Overview
          </Typography>
          <Typography>
            Welcome to your dashboard. This is where you'll find all your important metrics and data.
          </Typography>
        </Paper>
        
        <Paper sx={{ p: 3, flex: 1, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom>
            Quick Stats
          </Typography>
          <Typography>
            Your key metrics and statistics will appear here.
          </Typography>
        </Paper>
      </Box>
    </div>
  );
} 