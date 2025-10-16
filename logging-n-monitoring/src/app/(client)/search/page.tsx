'use client';
import React, { useEffect, useState } from 'react';
import {
  Container, Grid, Card, CardContent, CardMedia, Typography, Box, CircularProgress, Button, Rating, Chip, Paper, Divider, Stack
} from '@mui/material';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { useSentryUser } from '@/lib/useSentryUser';
import { useUserInfo } from '@/auth/UserProvider';
import { useKindeUser } from '@/auth/useKindeUser';
import { fetchWithCorrelation } from '@/lib/fetchWithCorrelation';

interface Product {
  id: number;
  name: string;
  price: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  image: string;
  sizes: number[];
}

const filters = [
  { label: 'Brand', options: ['Brooks', 'New Balance', 'ASICS', 'adidas'] },
  { label: "Men's Shoe Size", options: ['8', '9', '10', '11', '12'] },
  { label: "Men's Shoe Width", options: ['Narrow', 'Medium', 'Wide'] },
];

export default function SearchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: userLoading, displayName } = useUserInfo();
  const { session } = useKindeUser();
  useSentryUser(user);

  useEffect(() => {
    Sentry.captureMessage('Page loaded', {
      level: 'info',
      tags: { type: 'page_load' },
      extra: { page: '/search', user: displayName }
    });
    console.log('Page loaded: /search', { user: displayName });
    fetchWithCorrelation('/api/products', {}, user, session)
      .then((res) => res.json())
      .then((data) => setProducts(data.map((p: Product, i: number) => ({
        ...p,
        sizes: (!p.sizes || p.sizes.length === 0) ? [9] : p.sizes,
        rating: 4.5 + (i % 2) * 0.3,
        reviews: 1000 + i * 100,
        badge: undefined,
      }))))
      .finally(() => setLoading(false));
  }, [displayName, session]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Grid container spacing={2} alignItems="flex-start">
        {/* Sidebar Filters */}
        <Grid item xs={12} md={2}>
          <Paper sx={{ p: 1.5, mb: 2, minWidth: 180 }} elevation={2}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: 18 }}>Filters</Typography>
            {filters.map((filter) => (
              <Box key={filter.label} mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontSize: 14 }}>{filter.label}</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {filter.options.map((option) => (
                    <Chip key={option} label={option} size="small" clickable sx={{ mb: 0.5, fontSize: 12, height: 24 }} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Paper>
        </Grid>
        {/* Product Grid */}
        <Grid item xs={12} md={10}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 400, mb: 2 }}>Brooks Men's Shoes</Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid key={product.id} item xs={12} sm={6} md={4} lg={3}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 2, boxShadow: 1, border: '1px solid #eee', p: 1, minWidth: 220 }}>
                    {/* Image (clickable) */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 140, mt: 2, cursor: 'pointer' }} onClick={() => router.push(`/detail/${product.id}`)}>
                      <CardMedia
                        component="img"
                        image={product.image}
                        alt={product.name}
                        sx={{ objectFit: 'contain', width: '80%', maxHeight: 120 }}
                      />
                    </Box>
                    {/* Content */}
                    <CardContent sx={{ flexGrow: 1, p: 1, pb: '8px!important' }}>
                      <Typography variant="body1" noWrap sx={{ fontWeight: 500, cursor: 'pointer' }} onClick={() => router.push(`/detail/${product.id}`)}>{product.name}</Typography>
                      <Typography color="text.secondary" sx={{ fontSize: 15, mb: 0.5 }}>${product.price.toFixed(2)}</Typography>
                      <Box display="flex" alignItems="center" mb={0.5}>
                        <Rating value={product.rating} precision={0.1} readOnly size="small" sx={{ fontSize: 18 }} />
                        <Typography variant="caption" color="text.secondary" ml={0.5}>
                          ({product.reviews})
                        </Typography>
                      </Box>
                    </CardContent>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ p: 1, pt: 0 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ fontWeight: 600, fontSize: 15, py: 1, borderRadius: 1, boxShadow: 'none', textTransform: 'none' }}
                        onClick={() => {
                          Sentry.captureMessage('User added to cart', {
                            level: 'info',
                            tags: { type: 'user_action' },
                            extra: { productId: product.id, user: displayName }
                          });
                          console.log('User added to cart', product.id, { user: displayName });
                          if (typeof window !== 'undefined') {
                            const cartItems = JSON.parse(localStorage.getItem('cartItems') || '[]');
                            const sizeToAdd = Number(product.sizes[0]);
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
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  );
} 