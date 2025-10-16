'use client';
import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, Button, CardMedia, Paper, Grid, Divider, IconButton, Stack, Checkbox } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { productDetails } from '../../../data/products';
import { useRouter } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { useSentryUser } from '@/lib/useSentryUser';
import { useUserInfo } from '@/auth/UserProvider';

const cartProducts = productDetails.map((p) => ({
  id: p.id,
  name: p.name,
  image: p.image,
  color: p.color,
  size: 8.5, // default size for demo
  price: p.price,
  inStock: true,
  delivery: p.id === 2 ? 'Tomorrow, Jun 26' : p.id === 3 ? 'Jul 9 - 10' : 'Fri, Jun 27',
  prime: true,
  quantity: 1,
  badge: p.badge || '',
  priceNote: p.id === 3 ? 'Lowest price in 30 days' : '',
}));

const getCartItems = () => {
  if (typeof window !== 'undefined') {
    const items = JSON.parse(localStorage.getItem('cartItems') || '[]');
    return items;
  }
  return [];
};

export default function MyCartPage() {
  const [isClient, setIsClient] = useState(false);
  const [cartItems, setCartItems] = useState<{ id: number; quantity: number; size: number }[]>([]);
  const router = useRouter();
  const { user, isAuthenticated, isLoading: userLoading, displayName } = useUserInfo();
  useSentryUser(user);
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (isClient) setCartItems(getCartItems());
  }, [isClient]);
  useEffect(() => {
    Sentry.captureMessage('Page loaded', {
      level: 'info',
      tags: { type: 'page_load' },
      extra: { page: '/my_cart', user: displayName }
    });
    console.log('Page loaded: /my_cart', { user: displayName });
  }, [displayName]);
  if (!isClient) return null;

  const updateQuantity = (productId: number, newQuantity: number) => {
    const updatedItems = cartItems.map((item: { id: number; quantity: number; size: number }) => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ).filter((item: { id: number; quantity: number; size: number }) => item.quantity > 0);
    
    localStorage.setItem('cartItems', JSON.stringify(updatedItems));
    setCartItems(updatedItems);
  };

  const removeItem = (productId: number) => {
    const updatedItems = cartItems.filter((item: { id: number; quantity: number; size: number }) => item.id !== productId);
    localStorage.setItem('cartItems', JSON.stringify(updatedItems));
    setCartItems(updatedItems);
    Sentry.captureMessage('User removed item from cart', {
      level: 'info',
      tags: { type: 'user_action' },
      extra: { productId, user: displayName }
    });
    console.log('User removed item from cart', productId, { user: displayName });
  };

  const productsInCart = cartItems.map((item: { id: number; quantity: number; size: number }) => {
    const product = cartProducts.find((p) => p.id === item.id);
    return product ? { ...product, quantity: item.quantity, size: item.size } : null;
  }).filter(Boolean) as (typeof cartProducts[0] & { quantity: number; size: number })[];

  const subtotal = productsInCart.reduce((sum: number, item: typeof cartProducts[0] & { quantity: number; size: number }) => sum + item.price * item.quantity, 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>Shopping Cart</Typography>
            <Typography variant="body2" color="primary" sx={{ mb: 2, cursor: 'pointer' }}>Deselect all items</Typography>
            <Divider sx={{ mb: 2 }} />
            {productsInCart.length === 0 ? (
              <Typography>Your cart is empty.</Typography>
            ) : (
              productsInCart.map((cartItem, idx) => (
                <Box key={cartItem.id + '-' + cartItem.size} mb={3}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid>
                      <Checkbox checked sx={{ p: 0, mr: 1 }} />
                      <CardMedia
                        component="img"
                        image={cartItem.image}
                        alt={cartItem.name}
                        sx={{ width: 140, height: 100, objectFit: 'contain', borderRadius: 1, boxShadow: 1 }}
                      />
                    </Grid>
                    <Grid>
                      <Typography fontWeight={600}>{cartItem.name} - {cartItem.color} - Size: {cartItem.size} Medium</Typography>
                      {cartItem.badge && (
                        <Typography variant="caption" color="warning.main" fontWeight={700} sx={{ display: 'inline-block', mr: 1 }}>{cartItem.badge}</Typography>
                      )}
                      <Typography variant="body2" color="success.main" fontWeight={600}>In Stock</Typography>
                      {cartItem.prime && <Typography variant="body2" color="primary">✔ prime One-Day</Typography>}
                      <Typography variant="body2">FREE delivery <b>{cartItem.delivery}</b></Typography>
                      <Typography variant="body2" color="primary" sx={{ display: 'inline', mr: 1 }}>FREE Returns</Typography>
                      <Typography variant="body2" sx={{ display: 'inline' }}>| Size: <b>{cartItem.size}</b></Typography>
                      <Typography variant="body2" sx={{ display: 'inline', ml: 2 }}>Color: <b>{cartItem.color}</b></Typography>
                      <Box mt={1} display="flex" alignItems="center">
                        <IconButton size="small" color="error" onClick={() => removeItem(cartItem.id)}><DeleteIcon /></IconButton>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          sx={{ minWidth: 36, mx: 1 }}
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                        >
                          -
                        </Button>
                        <Button size="small" variant="outlined" sx={{ minWidth: 36, mx: 1 }}>{cartItem.quantity}</Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          sx={{ minWidth: 36 }}
                          onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                        >
                          +
                        </Button>
                        <Typography variant="body2" color="primary" sx={{ ml: 2, cursor: 'pointer' }} onClick={() => removeItem(cartItem.id)}>Delete</Typography>
                        <Typography variant="body2" color="primary" sx={{ ml: 2, cursor: 'pointer' }}>Save for later</Typography>
                        <Typography variant="body2" color="primary" sx={{ ml: 2, cursor: 'pointer' }}>Compare with similar items</Typography>
                        <Typography variant="body2" color="primary" sx={{ ml: 2, cursor: 'pointer' }}>Share</Typography>
                      </Box>
                    </Grid>
                    <Grid>
                      <Typography variant="h6" fontWeight={600} align="right">${(cartItem.price * cartItem.quantity).toFixed(2)}</Typography>
                      {cartItem.priceNote && <Typography variant="caption" color="error" fontWeight={700}>{cartItem.priceNote}</Typography>}
                    </Grid>
                  </Grid>
                  <Divider sx={{ mt: 2 }} />
                </Box>
              ))
            )}
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Typography variant="h6" fontWeight={600}>Subtotal ({productsInCart.length} item{productsInCart.length !== 1 ? 's' : ''}): ${subtotal.toFixed(2)}</Typography>
            </Box>
          </Paper>
        </Grid>
        {/* Right: Subtotal and checkout */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>Subtotal ({productsInCart.length} item{productsInCart.length !== 1 ? 's' : ''}): ${subtotal.toFixed(2)}</Typography>
            <Button variant="contained" color="warning" fullWidth sx={{ fontWeight: 700, fontSize: 18, py: 1.2, mt: 2 }}
              onClick={() => router.push('/checkout')}
            >
              Proceed to checkout
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
} 