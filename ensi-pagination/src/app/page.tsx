"use client";
import { useState, useEffect } from "react";
import {
  Box, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Select, MenuItem, Typography, IconButton, TextField, Button, Checkbox, Divider, Chip, Tooltip
} from "@mui/material";
import { ArrowBackIos, ArrowForwardIos, FilterList, Refresh, MoreVert, Menu as MenuIcon, Settings as SettingsIcon } from "@mui/icons-material";
import { useTransactionQuery } from "./useTransactionQuery";
import { Transaction } from "../backend";
import LinearProgress from "@mui/material/LinearProgress";

const TABS = [
  { label: "FOR REVIEW", color: "#e0d7ff" },
  { label: "SAVED", color: "#e0e7ef" },
  { label: "COMPLETED", color: "#e0f7ef" },
  { label: "EXCLUDED", color: "#f7e0e0" },
];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];

const SIDEBAR_ITEMS = [
  { label: "Dashboard" },
  { label: "Client Summary" },
  { label: "Banking" },
  { label: "Transactions", active: true },
  { label: "Monthly Close" },
  { label: "Chart of Accounts" },
  { label: "Payees" },
  { label: "Event Log" },
];

const CHUNK_SIZE = 10;

export default function Home() {
  const [tab, setTab] = useState<Transaction["status"]>(TABS[0].label as Transaction["status"]);
  // Navigation state per tab
  const [tabNav, setTabNav] = useState<Record<string, { page: number; search: string; rowsPerPage: number }>>({});
  const navState = tabNav[tab] || { page: 0, search: "", rowsPerPage: 10 };
  const [search, setSearch] = useState(navState.search);
  const [rowsPerPage, setRowsPerPage] = useState(navState.rowsPerPage);
  const [checked, setChecked] = useState<number[]>([]);

  const {
    data: paginated,
    total,
    pageSize,
    setPageSize,
    isLastPage,
    loading,
    resetQuery,
  } = useTransactionQuery({ where: { status: tab, search } }, navState.page, rowsPerPage, CHUNK_SIZE);

  // Tab counts
  const tabCounts = TABS.map(t => (t.label === tab ? total : ""));

  // Checkbox logic
  const allChecked = paginated.length > 0 && paginated.every(row => checked.includes(row.id));
  const handleCheckAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setChecked([...new Set([...checked, ...paginated.map(r => r.id)])]);
    else setChecked(checked.filter(id => !paginated.some(r => r.id === id)));
  };
  const handleCheck = (id: number) => {
    setChecked(checked => checked.includes(id) ? checked.filter(x => x !== id) : [...checked, id]);
  };

  // Helper to print state
  const printState = (action: string, when: 'before' | 'after') => {
    console.log(`[${action}][${when}]`, JSON.stringify({
      tab,
      navState,
      search,
      rowsPerPage,
      dataLength: paginated.length,
      total,
      isLastPage,
      loading
    }, null, 2));
  };

  // Track the last action for after-state logging
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Handle search (filtered display)
  const handleSearch = (val: string) => {
    printState('SEARCH', 'before');
    setTabNav(nav => ({
      ...nav,
      [tab]: { ...nav[tab], page: 0, search: val, rowsPerPage }
    }));
    setSearch(val);
    setChecked([]);
    resetQuery({ where: { status: tab, search: val } });
    setLastAction('SEARCH');
  };

  // Handle tab change (unfiltered display)
  const handleTabChange = (newTab: string) => {
    printState('TAB CHANGE', 'before');
    setTabNav(nav => {
      const updatedNav = {
        ...nav,
        [tab]: { ...nav[tab], page: navState.page, search, rowsPerPage }
      };
      const newNavState = updatedNav[newTab] || { page: 0, search: "", rowsPerPage: 10 };
      setTab(newTab as Transaction["status"]);
      setSearch(newNavState.search);
      setRowsPerPage(newNavState.rowsPerPage);
      setChecked([]);
      resetQuery({ where: { status: newTab as Transaction["status"], search: newNavState.search } });
      setLastAction('TAB CHANGE');
      return updatedNav;
    });
  };

  // Handle refresh (unfiltered display)
  const handleRefresh = () => {
    printState('REFRESH', 'before');
    setTabNav(nav => ({
      ...nav,
      [tab]: { ...nav[tab], page: 0, search: "", rowsPerPage }
    }));
    setSearch("");
    setChecked([]);
    resetQuery({ where: { status: tab } });
    setLastAction('REFRESH');
  };

  // Pagination helpers
  const from = total === 0 ? 0 : navState.page * rowsPerPage + 1;
  const to = Math.min((navState.page + 1) * rowsPerPage, total);

  // Pagination controls
  const goToPage = (newPage: number) => {
    printState('PAGE CHANGE', 'before');
    setTabNav(nav => ({
      ...nav,
      [tab]: { ...nav[tab], page: newPage, search, rowsPerPage }
    }));
    setLastAction('PAGE CHANGE');
  };

  // Page size change
  const handlePageSizeChange = (val: number) => {
    printState('PAGE SIZE CHANGE', 'before');
    setRowsPerPage(val);
    setTabNav(nav => ({
      ...nav,
      [tab]: { ...nav[tab], page: 0, search, rowsPerPage: val }
    }));
    setLastAction('PAGE SIZE CHANGE');
  };

  // Log after-state when any relevant state changes and lastAction is set
  useEffect(() => {
    if (lastAction) {
      printState(lastAction, 'after');
      setLastAction(null);
    }
  }, [tab, navState, search, rowsPerPage, paginated, total, isLastPage, loading]);

  return (
    <Box display="flex" minHeight="100vh" bgcolor="#f6f7fb">
      {/* Sidebar */}
      <Box width={240} bgcolor="#fff" boxShadow={1} display="flex" flexDirection="column" minHeight="100vh" zIndex={2}>
        <Box display="flex" alignItems="center" px={3} py={4}>
          <Box component="img" src="/ensi-logo.png" alt="ENSI" sx={{ width: 36, height: 36, mr: 1 }} />
          <Typography variant="h6" fontWeight={700} color="#7c3aed">ENSI</Typography>
        </Box>
        <Divider />
        <Box flex={1} mt={2}>
          {SIDEBAR_ITEMS.map(item => (
            <Box key={item.label} px={3} py={1.5} bgcolor={item.active ? "#f3e8ff" : undefined} borderRadius={2} mb={0.5} display="flex" alignItems="center" style={{ cursor: 'pointer' }}>
              {item.label === "Transactions" && <MenuIcon fontSize="small" sx={{ color: "#7c3aed", mr: 1 }} />}
              <Typography fontWeight={item.active ? 700 : 400} color={item.active ? "#7c3aed" : "#222"}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
        <Box mt="auto" px={3} py={2} display="flex" alignItems="center">
          <SettingsIcon fontSize="small" sx={{ mr: 1, color: '#888' }} />
          <Typography color="#888">Settings</Typography>
        </Box>
      </Box>
      {/* Main Content */}
      <Box flex={1} px={0} py={0}>
        {loading && <LinearProgress sx={{ position: 'sticky', top: 0, zIndex: 10 }} />}
        <Box px={5} pt={4} pb={2}>
          <Typography variant="h6" fontWeight={600} color="#222" mb={1}>
            Transactions Awaiting Review
          </Typography>
          {/* Tabs */}
          <Box display="flex" alignItems="center" mb={2}>
            {TABS.map((t, i) => (
              <Chip
                key={t.label}
                label={<Box display="flex" alignItems="center"><Typography fontWeight={600} color={tab === t.label ? "#7c3aed" : "#222"}>{t.label}</Typography><Box ml={1} bgcolor={tab === t.label ? "#7c3aed" : "#e0e0e0"} color="#fff" borderRadius={1} px={1.2} fontSize={13} fontWeight={700}>{tabCounts[i]}</Box></Box>}
                onClick={() => handleTabChange(t.label)}
                sx={{
                  mr: 2,
                  bgcolor: tab === t.label ? "#ede9fe" : "#f3f4f6",
                  border: tab === t.label ? "1.5px solid #7c3aed" : "1.5px solid #e0e0e0",
                  color: tab === t.label ? "#7c3aed" : "#222",
                  fontWeight: 600,
                  fontSize: 15,
                  height: 36,
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
          {/* Toolbar */}
          <Box display="flex" alignItems="center" mb={1}>
            <Button variant="contained" color="inherit" disabled sx={{ mr: 1, bgcolor: '#e5e7eb', color: '#888', fontWeight: 600 }}>Exclude</Button>
            <Button variant="contained" color="inherit" disabled sx={{ mr: 1, bgcolor: '#e5e7eb', color: '#888', fontWeight: 600 }}>Save</Button>
            <Button variant="contained" color="inherit" disabled sx={{ mr: 1, bgcolor: '#e5e7eb', color: '#888', fontWeight: 600 }}>Find Matches</Button>
            <Button variant="contained" color="inherit" disabled sx={{ mr: 1, bgcolor: '#e5e7eb', color: '#888', fontWeight: 600 }}>+ Add CoA</Button>
            <Button variant="contained" color="inherit" disabled sx={{ mr: 1, bgcolor: '#e5e7eb', color: '#888', fontWeight: 600 }}>+ Add Payee</Button>
            <Button variant="contained" color="inherit" sx={{ mr: 2, bgcolor: '#f3f4f6', color: '#222', fontWeight: 600 }}>Invoices/Bills</Button>
            <Box flex={1} />
            <IconButton><FilterList /></IconButton>
            <IconButton onClick={handleRefresh}><Refresh /></IconButton>
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
              sx={{ ml: 2, width: 220, bgcolor: '#fff' }}
              inputProps={{ style: { fontSize: 15 } }}
            />
            <Typography ml={2} color="#888" fontSize={15}>Show all ({total})</Typography>
          </Box>
          {/* Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 1, mt: 1 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f3f4f6' }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={allChecked} indeterminate={checked.length > 0 && !allChecked} onChange={handleCheckAll} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>DATE</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>DESCRIPTION</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>AMOUNT</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>CATEGORY</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>PAYEE</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>CONFIDENCE SCORE</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#888', fontSize: 14 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((row: Transaction, idx: number) => (
                  <TableRow key={row.id + '-' + idx} hover>
                    <TableCell padding="checkbox">
                      <Checkbox checked={checked.includes(row.id)} onChange={() => handleCheck(row.id)} />
                    </TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell sx={{ color: row.amount < 0 ? '#e11d48' : '#222', fontWeight: 600 }}>{row.amount < 0 ? '-' : ''}${Math.abs(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell>
                      <Select size="small" value={row.category} sx={{ minWidth: 140, bgcolor: '#f8fafc' }}>
                        <MenuItem key={row.category + '-' + idx} value={row.category}>{row.category}</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select size="small" value={row.payee} sx={{ minWidth: 160, bgcolor: '#f8fafc' }}>
                        <MenuItem key={row.payee + '-' + idx} value={row.payee}>{row.payee}</MenuItem>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.confidence + '%'}
                        sx={{
                          bgcolor: row.confidence >= 75 ? '#d1fae5' : '#fef9c3',
                          color: row.confidence >= 75 ? '#059669' : '#b45309',
                          fontWeight: 700,
                          minWidth: 56,
                        }}
                        icon={row.confidence >= 75 ? undefined : <Box component="span" sx={{ width: 8, height: 8, bgcolor: '#fbbf24', borderRadius: '50%' }} />}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small"><MoreVert /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">No transactions</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {/* Color Legend */}
          <Box display="flex" alignItems="center" mt={2} ml={1}>
            <Box display="flex" alignItems="center" mr={3}>
              <Box width={16} height={16} bgcolor="#a78bfa" borderRadius={1} mr={1} />
              <Typography fontSize={14} color="#888">AI</Typography>
            </Box>
            <Box display="flex" alignItems="center" mr={3}>
              <Box width={16} height={16} bgcolor="#cbd5e1" borderRadius={1} mr={1} />
              <Typography fontSize={14} color="#888">User (Saved)</Typography>
            </Box>
            <Box display="flex" alignItems="center" mr={3}>
              <Box width={16} height={16} bgcolor="#e5e7eb" borderRadius={1} mr={1} />
              <Typography fontSize={14} color="#888">User (Current)</Typography>
            </Box>
          </Box>
          {/* Pagination */}
          <Box display="flex" justifyContent="flex-end" alignItems="center" mt={2}>
            <Typography mr={2} color="#888">{from}-{to} of {total}</Typography>
            <IconButton
              onClick={() => goToPage(Math.max(0, navState.page - 1))}
              disabled={navState.page === 0}
              size="small"
            >
              <ArrowBackIos fontSize="small" />
            </IconButton>
            <IconButton
              onClick={() => goToPage(navState.page + 1 < Math.ceil(total / rowsPerPage) ? navState.page + 1 : navState.page)}
              disabled={navState.page + 1 >= Math.ceil(total / rowsPerPage)}
              size="small"
            >
              <ArrowForwardIos fontSize="small" />
            </IconButton>
            <Select
              size="small"
              value={rowsPerPage}
              onChange={e => handlePageSizeChange(Number(e.target.value))}
              sx={{ ml: 2, width: 80 }}
            >
              {ROWS_PER_PAGE_OPTIONS.map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
