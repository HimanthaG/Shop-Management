
import React, { useState, useCallback } from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { useAppTheme } from '../context/ThemeContext';

import {
  getProducts,
  getSalesSummary,
  getExpenses,
  getExpenseSummary,
} from '../services/database';

import {
  getDailyReport,
  getMonthlyReport,
  formatLocalDate,
} from '../services/reportService';

const MONTHS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const money = (value) =>
  `Rs. ${Number(value || 0).toFixed(2)}`;

export default function ReportsScreen() {

  const { colors, isDark } = useAppTheme();

  const styles = createStyles(colors, isDark);

  const [reportType, setReportType] = useState('all');

  const [selectedDate, setSelectedDate] =
    useState(new Date());

  const [report, setReport] = useState(null);
  const [stock, setStock] = useState(null);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ========================================
  // LOAD REPORT
  // ========================================

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');

      const products = await getProducts();

      const stockValue = products.reduce(
        (sum, product) =>
          sum +
          Number(product.quantity) *
          Number(product.cost_price),
        0
      );

      const totalUnits = products.reduce(
        (sum, product) =>
          sum + Number(product.quantity),
        0
      );

      setStock({
        totalProducts: products.length,
        totalUnits,
        stockValue,
      });

      let result;
      let expenseRecords = [];

      if (reportType === 'daily') {

        result = await getDailyReport(selectedDate);

      } else if (reportType === 'monthly') {

        result = await getMonthlyReport(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1
        );

      } else {

        const [
          sales,
          expenses,
          expenseSummary,
        ] = await Promise.all([
          getSalesSummary(),
          getExpenses(),
          getExpenseSummary(),
        ]);

        const revenue = Number(sales?.revenue || 0);

        const cost = Number(sales?.cost || 0);

        const grossProfit = Number(
          sales?.gross_profit || 0
        );

        const totalExpenses = Number(
          expenseSummary?.total_amount || 0
        );

        result = {
          totalSales: Number(sales?.total_sales || 0),
          revenue,
          cost,
          grossProfit,
          totalExpenses,
          netProfit: grossProfit - totalExpenses,

          totalExpenseRecords: Number(
            expenseSummary?.total_expenses || 0
          ),
        };

        expenseRecords = expenses;
      }

      setReport(result);

      // EXPENSE CATEGORIES

      if (reportType === 'all') {

        const totals = {};

        expenseRecords.forEach((expense) => {

          const name = expense.category || 'Other';

          totals[name] =
            (totals[name] || 0) +
            Number(expense.amount);

        });

        setCategories(
          Object.entries(totals)
            .map(([name, amount]) => ({
              name,
              amount,
            }))
            .sort((a, b) => b.amount - a.amount)
        );

      } else {

        setCategories([]);

      }

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [reportType, selectedDate])
  );

  // ========================================
  // DATE NAVIGATION
  // ========================================

  const changeDay = (amount) => {

    const next = new Date(selectedDate);

    next.setDate(next.getDate() + amount);

    setSelectedDate(next);
  };

  const changeMonth = (amount) => {

    const next = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() + amount,
      1
    );

    setSelectedDate(next);
  };

  // ========================================
  // REPORT ROW
  // ========================================

  const ReportRow = ({ label, value }) => (

    <View style={styles.reportRow}>

      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text style={styles.rowValue}>
        {value}
      </Text>

    </View>
  );

  // ========================================
  // PERIOD LABEL
  // ========================================

  const periodLabel =
    reportType === 'daily'
      ? formatLocalDate(selectedDate)
      : reportType === 'monthly'
      ? `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
      : 'All Recorded Transactions';

  // ========================================
  // SCREEN
  // ========================================

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >

      <Text style={styles.heading}>
        Shop Reports
      </Text>

      <Text style={styles.subtitle}>
        Offline sales, expenses and profit reports
      </Text>

      {/* REPORT TYPE TABS */}

      <View style={styles.tabRow}>

        {[
          { key: 'all', label: 'All Time' },
          { key: 'daily', label: 'Daily' },
          { key: 'monthly', label: 'Monthly' },
        ].map((item) => (

          <TouchableOpacity
            key={item.key}
            style={[
              styles.tabButton,
              reportType === item.key &&
                styles.activeTab,
            ]}
            onPress={() => setReportType(item.key)}
          >

            <Text
              style={[
                styles.tabText,
                reportType === item.key &&
                  styles.activeTabText,
              ]}
            >
              {item.label}
            </Text>

          </TouchableOpacity>

        ))}

      </View>

      {/* DATE NAVIGATION */}

      {reportType !== 'all' && (

        <View style={styles.periodCard}>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() =>
              reportType === 'daily'
                ? changeDay(-1)
                : changeMonth(-1)
            }
          >
            <Text style={styles.arrowText}>
              ‹
            </Text>
          </TouchableOpacity>

          <Text style={styles.periodText}>
            {periodLabel}
          </Text>

          <TouchableOpacity
            style={styles.arrowButton}
            onPress={() =>
              reportType === 'daily'
                ? changeDay(1)
                : changeMonth(1)
            }
          >
            <Text style={styles.arrowText}>
              ›
            </Text>
          </TouchableOpacity>

        </View>

      )}

      {/* LOADING */}

      {loading ? (

        <View style={styles.center}>

          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.helperText}>
            Loading report...
          </Text>

        </View>

      ) : error ? (

        <View style={styles.errorCard}>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadReport}
          >
            <Text style={styles.refreshText}>
              Try Again
            </Text>
          </TouchableOpacity>

        </View>

      ) : report ? (

        <>

          {/* FINANCIAL SUMMARY */}

          <View style={styles.financialCard}>

            <View style={styles.sectionHeader}>
              <View style={styles.blueIndicator} />

              <Text style={styles.sectionTitle}>
                Financial Summary
              </Text>
            </View>

            <Text style={styles.periodCaption}>
              {periodLabel}
            </Text>

            <ReportRow
              label="Sales Revenue"
              value={money(report.revenue)}
            />

            <ReportRow
              label="Cost of Goods Sold"
              value={money(report.cost)}
            />

            <ReportRow
              label="Gross Profit"
              value={money(report.grossProfit)}
            />

            <ReportRow
              label="Operating Expenses"
              value={money(report.totalExpenses)}
            />

            <View style={styles.divider} />

            <View style={styles.netProfitRow}>

              <Text style={styles.netLabel}>
                Net Profit
              </Text>

              <Text
                style={[
                  styles.netValue,
                  {
                    color: report.netProfit >= 0
                      ? '#16a34a'
                      : '#dc2626',
                  },
                ]}
              >
                {money(report.netProfit)}
              </Text>

            </View>

          </View>

          {/* TRANSACTION SUMMARY */}

          <View style={styles.transactionCard}>

            <View style={styles.sectionHeader}>
              <View style={styles.purpleIndicator} />

              <Text style={styles.sectionTitle}>
                Transaction Summary
              </Text>
            </View>

            <ReportRow
              label="Number of Sales"
              value={String(report.totalSales)}
            />

            <ReportRow
              label="Number of Expenses"
              value={String(
                report.totalExpenseRecords
              )}
            />

          </View>

          {/* CURRENT STOCK */}

          {stock && (

            <View style={styles.stockCard}>

              <View style={styles.sectionHeader}>
                <View style={styles.tealIndicator} />

                <Text style={styles.sectionTitle}>
                  Current Stock
                </Text>
              </View>

              <ReportRow
                label="Total Products"
                value={String(stock.totalProducts)}
              />

              <ReportRow
                label="Stock Units"
                value={String(stock.totalUnits)}
              />

              <ReportRow
                label="Stock Value"
                value={money(stock.stockValue)}
              />

              <Text style={styles.helperText}>
                Stock figures show the current inventory,
                regardless of the selected report period.
              </Text>

            </View>

          )}

          {/* EXPENSE CATEGORIES */}

          {reportType === 'all' && (

            <View style={styles.expenseCard}>

              <View style={styles.sectionHeader}>
                <View style={styles.orangeIndicator} />

                <Text style={styles.sectionTitle}>
                  Expenses by Category
                </Text>
              </View>

              {categories.length === 0 ? (

                <Text style={styles.helperText}>
                  No expenses recorded yet.
                </Text>

              ) : (

                categories.map((item) => (

                  <ReportRow
                    key={item.name}
                    label={item.name}
                    value={money(item.amount)}
                  />

                ))

              )}

            </View>

          )}

        </>

      ) : null}

      {/* REFRESH */}

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={loadReport}
        disabled={loading}
      >

        <Text style={styles.refreshText}>
          Refresh Report
        </Text>

      </TouchableOpacity>

      <Text style={styles.note}>
        Reports are calculated from your local SQLite
        database. No internet connection is required.
      </Text>

      <View style={{ height: 35 }} />

    </ScrollView>

  );
}

// ========================================
// LIGHT AND DARK MODE STYLES
// ========================================

const createStyles = (colors, isDark) =>
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: 16,
      paddingBottom: 30,
    },

    heading: {
      fontSize: 25,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 5,
    },

    subtitle: {
      fontSize: 14,
      color: colors.secondaryText,
      marginBottom: 18,
    },

    // TABS

    tabRow: {
      flexDirection: 'row',
      marginBottom: 15,
      gap: 6,
    },

    tabButton: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },

    activeTab: {
      backgroundColor: '#7c3aed',
      borderColor: '#7c3aed',
    },

    tabText: {
      color: colors.secondaryText,
      fontSize: 13,
      fontWeight: '600',
    },

    activeTabText: {
      color: '#ffffff',
    },

    // PERIOD NAVIGATION

    periodCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
    },

    arrowButton: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      backgroundColor: isDark ? '#25364f' : '#dbeafe',
      borderRadius: 8,
    },

    arrowText: {
      fontSize: 28,
      color: isDark ? '#93c5fd' : '#2563eb',
      fontWeight: 'bold',
    },

    periodText: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.text,
    },

    // COMMON CARDS

    financialCard: {
      backgroundColor: isDark ? '#192b43' : '#eff6ff',
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: isDark ? '#294566' : '#bfdbfe',
      borderTopWidth: 4,
      borderTopColor: '#2563eb',
    },

    transactionCard: {
      backgroundColor: isDark ? '#302342' : '#f5f3ff',
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: isDark ? '#51406c' : '#ddd6fe',
      borderTopWidth: 4,
      borderTopColor: '#8b5cf6',
    },

    stockCard: {
      backgroundColor: isDark ? '#153a38' : '#ecfdf5',
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: isDark ? '#285b55' : '#a7f3d0',
      borderTopWidth: 4,
      borderTopColor: '#0d9488',
    },

    expenseCard: {
      backgroundColor: isDark ? '#402b19' : '#fff7ed',
      padding: 16,
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: isDark ? '#654525' : '#fed7aa',
      borderTopWidth: 4,
      borderTopColor: '#f97316',
    },

    // SECTION HEADERS

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },

    blueIndicator: {
      width: 5,
      height: 22,
      backgroundColor: '#2563eb',
      borderRadius: 4,
      marginRight: 10,
    },

    purpleIndicator: {
      width: 5,
      height: 22,
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
      marginRight: 10,
    },

    tealIndicator: {
      width: 5,
      height: 22,
      backgroundColor: '#0d9488',
      borderRadius: 4,
      marginRight: 10,
    },

    orangeIndicator: {
      width: 5,
      height: 22,
      backgroundColor: '#f97316',
      borderRadius: 4,
      marginRight: 10,
    },

    periodCaption: {
      fontSize: 12,
      color: colors.secondaryText,
      marginBottom: 8,
    },

    // REPORT ROWS

    reportRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingVertical: 9,
      gap: 10,
    },

    rowLabel: {
      flex: 1,
      color: isDark ? '#cbd5e1' : '#475569',
      fontSize: 14,
    },

    rowValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
    },

    divider: {
      height: 1,
      backgroundColor: isDark ? '#475569' : '#bfdbfe',
      marginVertical: 10,
    },

    netProfitRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 10,
    },

    netLabel: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text,
    },

    netValue: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'right',
    },

    // MESSAGES

    center: {
      alignItems: 'center',
      padding: 25,
    },

    helperText: {
      color: colors.secondaryText,
      marginTop: 10,
      fontSize: 13,
      lineHeight: 19,
    },

    errorCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#dc2626',
      marginBottom: 15,
    },

    errorText: {
      color: '#dc2626',
      textAlign: 'center',
      marginBottom: 12,
    },

    // REFRESH BUTTON

    refreshButton: {
      backgroundColor: '#2563eb',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 15,
    },

    refreshText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 15,
    },

    note: {
      color: colors.secondaryText,
      fontSize: 12,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 10,
    },

  });
