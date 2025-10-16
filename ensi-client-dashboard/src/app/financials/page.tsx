"use client";
import { useState } from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area, BarChart, Bar, Sector, Tooltip } from "recharts";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';

// Income data (April 2024 - April 2025)
const incomeData = [
  { date: "Apr 2024", income: 12000 },
  { date: "May 2024", income: 13500 },
  { date: "Jun 2024", income: 14200 },
  { date: "Jul 2024", income: 12800 },
  { date: "Aug 2024", income: 15000 },
  { date: "Sep 2024", income: 16000 },
  { date: "Oct 2024", income: 17000 },
  { date: "Nov 2024", income: 15500 },
  { date: "Dec 2024", income: 18000 },
  { date: "Jan 2025", income: 17500 },
  { date: "Feb 2025", income: 16500 },
  { date: "Mar 2025", income: 19000 },
  { date: "Apr 2025", income: 20000 },
];

// COGS & Expenses bar chart data (April 2024 - April 2025)
const cogsExpensesBarData = [
  { date: "Apr 2024", cogs: 4000, expenses: 2000 },
  { date: "May 2024", cogs: 4200, expenses: 2100 },
  { date: "Jun 2024", cogs: 4300, expenses: 2200 },
  { date: "Jul 2024", cogs: 4100, expenses: 2100 },
  { date: "Aug 2024", cogs: 4500, expenses: 2300 },
  { date: "Sep 2024", cogs: 4700, expenses: 2400 },
  { date: "Oct 2024", cogs: 4800, expenses: 2500 },
  { date: "Nov 2024", cogs: 4600, expenses: 2300 },
  { date: "Dec 2024", cogs: 5000, expenses: 2600 },
  { date: "Jan 2025", cogs: 4900, expenses: 2500 },
  { date: "Feb 2025", cogs: 4700, expenses: 2400 },
  { date: "Mar 2025", cogs: 5200, expenses: 2700 },
  { date: "Apr 2025", cogs: 5400, expenses: 2800 },
];

// COGS pie chart (annualized for April 2024 - April 2025)
const cogsData = [
  { name: "Raw Materials", value: 22000 },
  { name: "Direct Labor", value: 26000 },
  { name: "Manufacturing Overhead", value: 12000 },
];

// Expenses pie chart (annualized for April 2024 - April 2025)
const expensesData = [
  { name: "Marketing & Advertising", value: 9000 },
  { name: "Rent & Utilities", value: 7000 },
  { name: "Salaries & Benefits", value: 5000 },
  { name: "Professional Services", value: 4000 },
  { name: "Office Supplies", value: 3500 },
  { name: "Travel & Entertainment", value: 3200 },
  { name: "Insurance", value: 1500 },
  { name: "Maintenance", value: 1300 },
];

// Soft, cool-toned palette from provided donut chart image
const cogsColors = [
  "#A3D8C6", // mint green
  "#8EC6F7", // sky blue
  "#F7E38D", // pastel yellow
];

const expensesColors = [
  "#A3D8C6", // mint green
  "#BCC2C6", // light gray
  "#F7E38D", // pastel yellow
  "#8EC6F7", // sky blue
  "#B9AEEA", // lavender
  "#C7D6F7", // periwinkle
  "#6D8FEA", // cornflower blue
  "#8EC6F7", // blue (repeat for more slices)
];

// Helper to format as dollars
const formatDollar = (value: number) => `$${value.toLocaleString()}`;

// Custom label for non-active segments
const renderPieLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, name, value, index, activeIndex } = props;
  if (index === activeIndex) return null;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius * 1.35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const lineRadius = outerRadius * 1.18;
  const lineX = cx + lineRadius * Math.cos(-midAngle * RADIAN);
  const lineY = cy + lineRadius * Math.sin(-midAngle * RADIAN);
  return (
    <g>
      <line
        x1={cx + outerRadius * 0.8 * Math.cos(-midAngle * RADIAN)}
        y1={cy + outerRadius * 0.8 * Math.sin(-midAngle * RADIAN)}
        x2={lineX}
        y2={lineY}
        stroke="#90A4AE"
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        fill="#789"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {`${name}: $${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

// Custom tooltip for Income panel
const IncomeTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <Box sx={{ bgcolor: 'white', p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>Income</Typography>
        <Typography variant="body2" color="text.secondary">
          {`$${value.toLocaleString()}`}
        </Typography>
      </Box>
    );
  }
  return null;
};

// --- PIE POP-OUT EFFECT ---
const renderActiveShape = (props: any) => {
  const {
    cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;
  const RADIAN = Math.PI / 180;
  const offset = 7;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const cxOffset = cx + offset * cos;
  const cyOffset = cy + offset * sin;
  const radius = outerRadius * 1.35;
  const x = cxOffset + radius * Math.cos(-midAngle * RADIAN);
  const y = cyOffset + radius * Math.sin(-midAngle * RADIAN);
  const lineRadius = outerRadius * 1.18;
  const lineX = cxOffset + lineRadius * Math.cos(-midAngle * RADIAN);
  const lineY = cyOffset + lineRadius * Math.sin(-midAngle * RADIAN);
  return (
    <g>
      <Sector
        cx={cxOffset}
        cy={cyOffset}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ transition: 'all 0.45s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <line
        x1={cxOffset + outerRadius * 0.8 * Math.cos(-midAngle * RADIAN)}
        y1={cyOffset + outerRadius * 0.8 * Math.sin(-midAngle * RADIAN)}
        x2={lineX}
        y2={lineY}
        stroke="#90A4AE"
        strokeWidth={1}
      />
      <text
        x={x}
        y={y}
        fill="#789"
        textAnchor={x > cxOffset ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
      >
        {`${payload.name}: $${value.toLocaleString()} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

export default function FinancialsPage() {
  const [pendingStartDate, setPendingStartDate] = useState<dayjs.Dayjs | null>(dayjs('2020-01-01'));
  const [pendingEndDate, setPendingEndDate] = useState<dayjs.Dayjs | null>(dayjs('2022-12-31'));
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(dayjs('2020-01-01'));
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(dayjs('2022-12-31'));
  const [activeIndexCogs, setActiveIndexCogs] = useState(-1);
  const [activeIndexExpenses, setActiveIndexExpenses] = useState(-1);
  const [panelRenderKey, setPanelRenderKey] = useState(0);
  const [barHoverIndex, setBarHoverIndex] = useState<number | null>(null);

  // Find the Paper sx for the Income panel and apply it to the other two panels
  const panelPaperSx = {
    boxShadow: '0 6px 24px rgba(0,0,0,0.16)',
    borderRadius: 4,
    p: 3,
    mb: 4,
    border: '1.5px solid #b0b8c1',
    transition: 'box-shadow 0.18s',
    '&:hover, &:focus-within': {
      boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
    },
  };

  const CustomBar = (props: any) => {
    const { x, y, width, height, fill, value, index, dataKey, payload } = props;
    const isExpenses = dataKey === "expenses";
    const radius = isExpenses ? 8 : 0;
    const isHovered = barHoverIndex === index;
    const style = {
      cursor: "pointer",
      filter: isHovered ? "drop-shadow(0 6px 18px rgba(80,120,200,0.20)) brightness(1.04)" : undefined,
      transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
      transform: isHovered ? "scaleY(1.02)" : undefined,
      transformOrigin: "bottom"
    };
    // Get both values from payload
    const cogs = payload.cogs;
    const expenses = payload.expenses;
    return (
      <g>
        {isExpenses ? (
          <path
            d={`
              M${x},${y + height}
              L${x},${y + radius}
              Q${x},${y} ${x + radius},${y}
              L${x + width - radius},${y}
              Q${x + width},${y} ${x + width},${y + radius}
              L${x + width},${y + height}
              Z
            `}
            fill={fill}
            style={style}
            onMouseEnter={() => setBarHoverIndex(index)}
            onMouseLeave={() => setBarHoverIndex(null)}
          />
        ) : (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            style={style}
            onMouseEnter={() => setBarHoverIndex(index)}
            onMouseLeave={() => setBarHoverIndex(null)}
          />
        )}
        {isHovered && isExpenses && (
          <>
            <text
              x={x + width / 2}
              y={y - 44}
              textAnchor="middle"
              fill="#789"
              fontWeight={600}
              fontSize={13}
            >
              {`COGS: $${cogs.toLocaleString()}`}
            </text>
            <text
              x={x + width / 2}
              y={y - 28}
              textAnchor="middle"
              fill="#789"
              fontWeight={600}
              fontSize={13}
            >
              {`Expenses: $${expenses.toLocaleString()}`}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <Box sx={{ p: 3, pr: 6, minHeight: "calc(100vh - 64px)", display: 'flex', flexDirection: 'column' }}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <DatePicker
            label="Start Date"
            value={pendingStartDate}
            onChange={setPendingStartDate}
          />
          <Typography sx={{ mx: 1 }}>to</Typography>
          <DatePicker
            label="End Date"
            value={pendingEndDate}
            onChange={setPendingEndDate}
          />
          <Button
            variant="contained"
            sx={{
              ml: 2,
              height: 44,
              px: 4,
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'none',
              boxShadow: '0 2px 8px rgba(80,120,200,0.13)',
              background: 'linear-gradient(90deg, #90b4e8 0%, #5a8fd6 100%)',
              color: '#fff',
              '&:hover': {
                background: 'linear-gradient(90deg, #5a8fd6 0%, #90b4e8 100%)',
                boxShadow: '0 4px 16px rgba(80,120,200,0.18)',
              },
            }}
            onClick={() => {
              setStartDate(pendingStartDate);
              setEndDate(pendingEndDate);
              setPanelRenderKey(k => k + 1);
            }}
          >
            Update
          </Button>
        </Box>
      </LocalizationProvider>
      {/* Income Chart Panel */}
      <Paper elevation={8} sx={panelPaperSx} key={`income-${panelRenderKey}`}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontFamily: 'Poppins, Inter, Arial, sans-serif',
            fontSize: 28,
            mb: 2,
            color: '#5a8fd6',
          }}
        >
          Income
        </Typography>
        <Box sx={{ width: "100%", height: 500 }}>
          <ResponsiveContainer>
            <LineChart
              width={800}
              height={400}
              data={incomeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{
                        backgroundColor: 'white',
                        padding: '10px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        fontFamily: 'Arial, sans-serif',
                        fontSize: '14px',
                        color: '#333'
                      }}>
                        <p style={{ margin: '0 0 5px 0' }}>{payload[0].payload.date || 'N/A'}</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>
                          Income: ${payload[0].value ? payload[0].value.toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#8884d8"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      {/* COGS & Expenses Bar Chart Panel */}
      <Paper elevation={8} sx={panelPaperSx} key={`bar-${panelRenderKey}`}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontFamily: 'Poppins, Inter, Arial, sans-serif',
            fontSize: 28,
            mb: 2,
            color: '#5a8fd6',
          }}
        >
          COGS & Expenses
        </Typography>
        <Box sx={{ width: "100%", height: 500 }}>
          <ResponsiveContainer>
            <BarChart data={cogsExpensesBarData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" minTickGap={20} tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${v.toLocaleString()}`} />
              <Legend verticalAlign="top" height={36} />
              <Bar
                dataKey="cogs"
                name="COGS"
                stackId="a"
                fill="#A3D8C6"
                barSize={56}
                shape={(props: any) => (
                  <CustomBar
                    {...props}
                    value={props.payload.cogs}
                    dataKey="cogs"
                  />
                )}
              />
              <Bar
                dataKey="expenses"
                name="Expenses"
                stackId="a"
                fill="#8EC6F7"
                barSize={56}
                shape={(props: any) => (
                  <CustomBar
                    {...props}
                    value={props.payload.expenses}
                    dataKey="expenses"
                  />
                )}
              />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
      {/* COGS + EXPENSES Panel */}
      <Paper elevation={8} sx={panelPaperSx} key={`breakdown-${panelRenderKey}`}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontFamily: 'Poppins, Inter, Arial, sans-serif',
            fontSize: 28,
            mb: 3,
            color: '#5a8fd6',
          }}
        >
          COGS & Expenses Breakdown
        </Typography>
        <Box sx={{ display: "flex", gap: 4, minHeight: 500 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0 }}>
                <Typography 
                  variant="h5" 
                  sx={{ fontWeight: 800, color: '#5a8fd6', letterSpacing: '0.5px', mb: 0, lineHeight: 1, pb: 0 }}
                >
                  COGS
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, pt: 0, mt: -2 }}>
                <ResponsiveContainer>
                  <PieChart margin={{ top: 0, right: 60, bottom: 20, left: 60 }} style={{ outline: 'none' }}>
                    <Pie
                      data={cogsData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius="70%"
                      label={props => renderPieLabel({ ...props, activeIndex: activeIndexCogs })}
                      labelLine={false}
                      animationDuration={1500}
                      activeIndex={activeIndexCogs}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, idx) => setActiveIndexCogs(idx)}
                      onMouseLeave={() => setActiveIndexCogs(-1)}
                    >
                      {cogsData.map((entry, idx) => (
                        <Cell key={`cell-cogs-${idx}`} fill={cogsColors[idx % cogsColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Box>
          <Box sx={{ 
            width: '2px', 
            bgcolor: '#e0e0e0', 
            mt: '3%',
            mb: 'auto',
            height: '60%',
            alignSelf: 'center'
          }} />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0 }}>
                <Typography 
                  variant="h5" 
                  sx={{ fontWeight: 800, color: '#5a8fd6', letterSpacing: '0.5px', mb: 0, lineHeight: 1, pb: 0 }}
                >
                  Expenses
                </Typography>
              </Box>
              <Box sx={{ flex: 1, minHeight: 0, pt: 0, mt: -2 }}>
                <ResponsiveContainer>
                  <PieChart margin={{ top: 0, right: 60, bottom: 20, left: 60 }} style={{ outline: 'none' }}>
                    <Pie
                      data={expensesData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="48%"
                      outerRadius="70%"
                      label={props => renderPieLabel({ ...props, activeIndex: activeIndexExpenses })}
                      labelLine={false}
                      animationDuration={1500}
                      activeIndex={activeIndexExpenses}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, idx) => setActiveIndexExpenses(idx)}
                      onMouseLeave={() => setActiveIndexExpenses(-1)}
                    >
                      {expensesData.map((entry, idx) => (
                        <Cell key={`cell-exp-${idx}`} fill={expensesColors[idx % expensesColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}