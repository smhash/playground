"use client";
import React, { useState, useEffect } from "react";
import { Box, Button, CardMedia, Container, Divider, Grid, IconButton, Paper, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from 'next/navigation';
import { productDetails } from "../../../data/products";

function getCartItems() {
  if (typeof window !== "undefined") {
    const items = JSON.parse(localStorage.getItem("cartItems") || "[]");
    return items;
  }
  return [];
}

export default function CheckoutPage() {
  const [isClient, setIsClient] = useState(false);
  const [cartItems, setCartItems] = useState<{ id: number; quantity: number; size: number }[]>([]);
  const router = useRouter();
  useEffect(() => {
    setIsClient(true);
  }, []);
  useEffect(() => {
    if (isClient) setCartItems(getCartItems());
  }, [isClient]);
  if (!isClient) return null;

  const updateQuantity = (productId: number, newQuantity: number) => {
    const updatedItems = cartItems.map((item: { id: number; quantity: number; size: number }) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    ).filter((item: { id: number; quantity: number; size: number }) => item.quantity > 0);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    setCartItems(updatedItems);
  };

  const removeItem = (productId: number) => {
    const updatedItems = cartItems.filter((item: { id: number; quantity: number; size: number }) => item.id !== productId);
    localStorage.setItem("cartItems", JSON.stringify(updatedItems));
    setCartItems(updatedItems);
  };

  const productsInCart = cartItems.map((item: { id: number; quantity: number; size: number }) => {
    const product = productDetails.find((p: typeof productDetails[0]) => p.id === item.id);
    return product ? { ...product, quantity: item.quantity, size: item.size } : null;
  }).filter(Boolean) as (typeof productDetails[0] & { quantity: number; size: number })[];

  const subtotal = productsInCart.reduce((sum: number, item: typeof productDetails[0] & { quantity: number; size: number }) => sum + item.price * item.quantity, 0);
  const estimatedTax = subtotal > 0 ? Math.round(subtotal * 0.0975 * 100) / 100 : 0;
  const orderTotal = subtotal + estimatedTax;

  return (
    <Box sx={{ bgcolor: "#fafbfc", minHeight: "100vh", pb: 6 }}>
      <Box sx={{ bgcolor: "#232f3e", color: "#fff", py: 2, px: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <img src="/vercel.svg" alt="Amazon" style={{ height: 32, marginRight: 12 }} />
          <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: 1 }}>Secure checkout</Typography>
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: 8 }}>Cart</span>
            <img src="/window.svg" alt="Cart" style={{ height: 24 }} />
          </Typography>
        </Box>
      </Box>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography fontWeight={600} mb={1}>Delivering to Sohail Hashemi</Typography>
              <Typography variant="body2" color="text.secondary">600 ROSINCRESS CT, SAN RAMON, CA, 94582-5079, United States</Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 1, cursor: "pointer" }}>Add delivery instructions</Typography>
            </Paper>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography fontWeight={600} mb={1}>Paying with Prime Visa 9841</Typography>
              <Typography variant="body2" color="text.secondary">Earns 5% back</Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 1, cursor: "pointer" }}>Select a payment plan</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Like $18.11/mo (6 mo) at 0% APR</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Use Amazon Visa rewards points <b>$1,531.38 (153,138 points)</b> available</Typography>
              <Typography variant="body2" color="primary" sx={{ mt: 1, cursor: "pointer" }}>Use a gift card, voucher, or promo code</Typography>
            </Paper>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography fontWeight={600} mb={2}>Arriving Jul 9, 2025 - Jul 10, 2025</Typography>
              {productsInCart.length === 0 ? (
                <Typography>Your cart is empty.</Typography>
              ) : (
                productsInCart.map((cartItem, idx) => (
                  <Box key={cartItem.id + '-' + cartItem.size} mb={3} display="flex" alignItems="stretch">
                    <Box sx={{ width: 120, mr: 2, display: 'flex', alignItems: 'center' }}>
                      <CardMedia
                        component="img"
                        image={cartItem.image}
                        alt={cartItem.name}
                        sx={{ width: 120, height: 90, objectFit: "contain", borderRadius: 1, boxShadow: 1, bgcolor: "#fff" }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={600}>{cartItem.name} - {cartItem.color} - Size: {cartItem.size} Medium</Typography>
                      <Typography variant="body2" color="text.secondary">Ships from Dp Fami | Sold by Dp Fami</Typography>
                      <Typography variant="body2" color="primary">& FREE Returns</Typography>
                      <Typography variant="body2" color="success.main">In Stock</Typography>
                      <Box mt={1} display="flex" alignItems="center">
                        <IconButton size="small" color="error" onClick={() => removeItem(cartItem.id)}><DeleteIcon /></IconButton>
                        <Button size="small" variant="outlined" sx={{ minWidth: 36, mx: 1 }} onClick={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}>-</Button>
                        <Button size="small" variant="outlined" sx={{ minWidth: 36, mx: 1 }}>{cartItem.quantity}</Button>
                        <Button size="small" variant="outlined" sx={{ minWidth: 36 }} onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}>+</Button>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', minWidth: 120, height: '100%', ml: 2 }}>
                      <Typography fontWeight={600} align="right" sx={{ fontSize: 18 }}>${cartItem.price.toFixed(2)}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                By placing your order, you agree to Amazon's privacy notice and conditions of use.
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Items:</Typography>
                <Typography>${subtotal.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Shipping & handling:</Typography>
                <Typography>$0.00</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography>Estimated tax to be collected:*</Typography>
                <Typography>${estimatedTax.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography fontWeight={700}>Order total:</Typography>
                <Typography fontWeight={700} fontSize={22}>${orderTotal.toFixed(2)}</Typography>
              </Box>
              <Button
                variant="contained"
                color="warning"
                fullWidth
                sx={{ fontWeight: 700, fontSize: 20, py: 1.5, letterSpacing: 1, borderRadius: 1, boxShadow: 2 }}
                onClick={() => router.push('/order-confirmation')}
              >
                PLACE YOUR ORDER
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
} 