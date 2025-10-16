'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container, Box, Typography, Button, Card, CardMedia, Rating, Chip, Divider, Grid, Paper, Stack
} from '@mui/material';
import { productDetails } from '../../../../data/products';

export default function DetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const product = productDetails.find((p) => String(p.id) === String(id));
  const [selectedSize, setSelectedSize] = useState<number | null>(null);

  if (!product) return <Typography>Product not found</Typography>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Grid container spacing={4}>
        {/* Left: Image and Ask section */}
        <Grid item xs={12} md={7}>
          <Box display="flex" flexDirection="column" alignItems="center">
            <CardMedia
              component="img"
              image={product.image}
              alt={product.name}
              sx={{ width: '100%', maxWidth: 420, objectFit: 'contain', mb: 2, borderRadius: 2, boxShadow: 1 }}
            />
            <Box mt={2}>
              <Chip label="Ask Rufus" color="warning" size="small" sx={{ fontWeight: 600, fontSize: 14, mb: 1 }} />
              <Stack direction="row" spacing={1} mt={1}>
                <Button size="small" variant="outlined">What type of running is it good for?</Button>
                <Button size="small" variant="outlined">Does it have good traction?</Button>
                <Button size="small" variant="outlined">Is it lightweight?</Button>
              </Stack>
              <Button size="small" variant="contained" sx={{ mt: 1 }}>Ask something else</Button>
            </Box>
          </Box>
        </Grid>
        {/* Right: Details */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>{product.name}</Typography>
            <Box display="flex" alignItems="center" mb={1}>
              <Rating value={product.rating} precision={0.1} readOnly size="small" />
              <Typography variant="body2" color="text.secondary" ml={1}>({product.reviews})</Typography>
              {product.badge && (
                <Chip label={product.badge} color={product.badge === 'Best Seller' ? 'warning' : 'default'} size="small" sx={{ ml: 2, fontWeight: 600, fontSize: 13, background: product.badge === 'Overall Pick' ? '#222' : '#ff9900', color: '#fff' }} />
              )}
            </Box>
            <Typography variant="h4" color="primary" fontWeight={700} gutterBottom>${product.price.toFixed(2)}</Typography>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>Color: {product.color}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Size:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
              {product.sizes.map((size) => (
                <Button
                  key={size}
                  variant={selectedSize === size ? 'contained' : 'outlined'}
                  size="small"
                  sx={{ minWidth: 40, fontWeight: 600 }}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </Button>
              ))}
            </Stack>
            <Button variant="contained" color="warning" fullWidth sx={{ fontWeight: 700, fontSize: 18, py: 1.2, mb: 2 }}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
                  const sizeToAdd = selectedSize || product.sizes[0];
                  const idx = cartItems.findIndex((item: any) => item.id === product.id && item.size === sizeToAdd);
                  if (idx >= 0) {
                    cartItems[idx].quantity += 1;
                  } else {
                    cartItems.push({ id: product.id, quantity: 1, size: sizeToAdd });
                  }
                  localStorage.setItem('cartItems', JSON.stringify(cartItems));
                }
                router.push('/my_cart');
              }}
            >
              Add to Cart
            </Button>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>Product details</Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              {product.details.map((d) => (
                <li key={d.label} style={{ marginBottom: 4 }}><b>{d.label}:</b> {d.value}</li>
              ))}
            </Box>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>About this item</Typography>
            <Box component="ul" sx={{ pl: 3, mb: 2 }}>
              {product.about.map((line: string, idx: number) => (
                <li key={idx} style={{ marginBottom: 6 }}><Typography variant="body2" color="text.secondary">{line}</Typography></li>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 