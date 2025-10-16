"use client";

import { Box, Toolbar, Typography, IconButton, Avatar } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";

export default function Topbar() {
  return (
    <Toolbar sx={{ background: "#fff", color: "#222", boxShadow: 1, minHeight: 64, pl: 0 }}>
      <Box flexGrow={1} mt={3}>
        <Typography variant="h5" fontWeight={700} sx={{ fontFamily: 'Poppins, Inter, Arial, sans-serif', fontSize: 30, color: '#444' }}>
          Welcome Talha Abadin
        </Typography>
        <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins, Inter, Arial, sans-serif', fontWeight: 500, fontSize: 18, color: '#888' }}>
          Client: V22 FARMS LLC
        </Typography>
      </Box>
      <IconButton color="inherit" aria-label="notifications">
        <NotificationsIcon />
      </IconButton>
      <IconButton color="inherit" aria-label="avatar">
        <Avatar />
      </IconButton>
    </Toolbar>
  );
} 