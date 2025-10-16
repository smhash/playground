import { Box, Typography, Button } from '@mui/material';
import Link from 'next/link';

export default function OrderConfirmation() {
  return (
    <Box minHeight="80vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" bgcolor="#fafbfc">
      <Typography variant="h3" fontWeight={700} color="success.main" gutterBottom>
        Thank you for your order!
      </Typography>
      <Typography variant="h5" color="text.secondary" mb={4}>
        Your order has been placed and is being processed.
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        You will receive an email confirmation shortly. If you have any questions, please contact our support team.
      </Typography>
      <Button component={Link} href="/" variant="contained" color="primary" size="large" sx={{ fontWeight: 700, fontSize: 18, px: 4, py: 1.5, borderRadius: 2 }}>
        Continue Shopping
      </Button>
    </Box>
  );
} 