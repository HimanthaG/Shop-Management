
import { getDatabase } from './database';

// Format a date as YYYY-MM-DD using local time.
export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Convert a local date range into SQLite UTC timestamps.
// The end date is exclusive.
const getDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    throw new Error('Invalid report date range.');
  }

  const toSQLiteUTC = (date) =>
    date.toISOString().slice(0, 19).replace('T', ' ');

  return {
    start: toSQLiteUTC(start),
    end: toSQLiteUTC(end),
  };
};

// Get sales and expenses within a date range.
export const getReportForDateRange = async (
  startDate,
  endDate
) => {
  const db = await getDatabase();
  const { start, end } = getDateRange(startDate, endDate);

  const sales = await db.getFirstAsync(
    `SELECT
       COUNT(*) AS total_sales,
       COALESCE(SUM(total_amount), 0) AS revenue,
       COALESCE(SUM(total_cost), 0) AS cost,
       COALESCE(SUM(profit), 0) AS gross_profit
     FROM sales
     WHERE created_at >= ? AND created_at < ?`,
    [start, end]
  );

  const expenses = await db.getFirstAsync(
    `SELECT
       COUNT(*) AS total_expenses,
       COALESCE(SUM(amount), 0) AS expense_amount
     FROM expenses
     WHERE created_at >= ? AND created_at < ?`,
    [start, end]
  );

  const revenue = Number(sales.revenue);
  const cost = Number(sales.cost);
  const grossProfit = Number(sales.gross_profit);
  const totalExpenses = Number(expenses.expense_amount);

  return {
    totalSales: Number(sales.total_sales),
    revenue,
    cost,
    grossProfit,
    totalExpenses,
    netProfit: grossProfit - totalExpenses,
    totalExpenseRecords: Number(expenses.total_expenses),
  };
};

// Get today's report using the phone's local date.
export const getDailyReport = async (date = new Date()) => {
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1
  );

  return getReportForDateRange(start, end);
};

// Get a monthly report.
// month uses 1 for January and 12 for December.
export const getMonthlyReport = async (year, month) => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error('Invalid year or month.');
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  return getReportForDateRange(start, end);
};
