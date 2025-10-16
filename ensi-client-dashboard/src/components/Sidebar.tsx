"use client";

import { Box, Drawer, List, ListItem, ListItemIcon, ListItemText, Toolbar, Typography, IconButton, useTheme, useMediaQuery } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Home";
import FinancialsIcon from "@mui/icons-material/AttachMoney";
import MenuIcon from '@mui/icons-material/Menu';
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

const drawerWidth = 380;

export default function Sidebar() {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <>
      <Toolbar sx={{ justifyContent: "flex-start", mt: 1, pl: 1, minHeight: 48 }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { xs: 'block', md: 'none' } }}
          data-testid="sidebar-menu-button"
          className="mobile-menu-button"
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
      <Box display="flex" flexDirection="row" alignItems="center" justifyContent="center" sx={{ mb: 4 }}>
        <Box component="img" src="/ensi-logo.png" alt="ENSI" sx={{ height: 64, mr: 2 }} />
        <Typography variant="h4" fontWeight={800} color="primary" sx={{ fontFamily: 'Poppins, Inter, Arial, sans-serif', fontSize: 36, textAlign: 'center' }}>
          ENSI
        </Typography>
      </Box>
      <List>
        <ListItem
          component={Link}
          href="/"
          sx={{
            bgcolor: pathname === "/" ? '#e0e0e0' : undefined,
          }}
        >
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText
            primary="Dashboard"
            primaryTypographyProps={{
              fontFamily: 'Poppins, Inter, Arial, sans-serif',
              fontWeight: pathname === "/" ? 700 : 500,
              fontSize: 22,
              color: pathname === "/" ? '#222' : '#222',
            }}
          />
        </ListItem>
        <ListItem
          component={Link}
          href="/financials"
          sx={{
            bgcolor: pathname === "/financials" ? "#a600ff" : undefined,
            color: pathname === "/financials" ? "#fff" : undefined,
            '& .MuiListItemIcon-root': {
              color: pathname === "/financials" ? "#fff" : undefined,
            },
          }}
        >
          <ListItemIcon><FinancialsIcon /></ListItemIcon>
          <ListItemText
            primary="Financials"
            primaryTypographyProps={{
              fontFamily: 'Poppins, Inter, Arial, sans-serif',
              fontWeight: pathname === "/financials" ? 700 : 500,
              fontSize: 22,
              color: pathname === "/financials" ? '#fff' : '#222',
            }}
          />
        </ListItem>
      </List>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
} 