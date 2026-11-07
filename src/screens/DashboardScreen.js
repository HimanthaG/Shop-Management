
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

import {
  getProducts,
  getSales,
  getSalesSummary,
  getExpenses,
  getExpenseSummary,
} from '../services/database';

import {
  useAppTheme,
} from '../context/ThemeContext';

const EMPTY_DATA = {
  revenue: 0,
  stockValue: 0,
  expenses: 0,
  grossProfit: 0,
  netProfit: 0,
  totalProducts: 0,
  recentSales: [],
  recentExpenses: [],
};

export default function DashboardScreen({ navigation }) {
  const { isDark, colors } = useAppTheme();

  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [
        products,
        sales,
        salesSummary,
        expenses,
        expenseSummary,
      ] = await Promise.all([
        getProducts(),
        getSales(),
        getSalesSummary(),
        getExpenses(),
        getExpenseSummary(),
      ]);

      const stockValue = products.reduce(
        (total, product) =>
          total +
          Number(product.quantity || 0) *
            Number(product.cost_price || 0),
        0
      );

      const revenue = Number(
        salesSummary?.revenue || 0
      );

      const grossProfit = Number(
        salesSummary?.gross_profit || 0
      );

      const totalExpenses = Number(
        expenseSummary?.total_amount || 0
      );

      setData({
        revenue,
        stockValue,
        expenses: totalExpenses,
        grossProfit,
        netProfit: grossProfit - totalExpenses,
        totalProducts: products.length,
        recentSales: sales.slice(0, 3),
        recentExpenses: expenses.slice(0, 3),
      });
    } catch (error) {
      setData(EMPTY_DATA);

      Alert.alert(
        'Dashboard Error',
        error.message || 'Unable to load dashboard.'
      );
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const formatMoney = (value) =>
    `Rs. ${Number(value || 0).toFixed(2)}`;

  const palette = {
    revenue: {
      background: isDark ? '#172554' : '#dbeafe',
      text: isDark ? '#93c5fd' : '#1d4ed8',
    },
    stock: {
      background: isDark ? '#422006' : '#fef3c7',
      text: isDark ? '#fcd34d' : '#b45309',
    },
    expenses: {
      background: isDark ? '#450a0a' : '#fee2e2',
      text: isDark ? '#fca5a5' : '#dc2626',
    },
    profit: {
      background: isDark ? '#052e16' : '#dcfce7',
      text: isDark ? '#86efac' : '#15803d',
    },
    business: {
      background: isDark ? '#172554' : '#eff6ff',
      border: isDark ? '#1e40af' : '#bfdbfe',
      title: isDark ? '#93c5fd' : '#1d4ed8',
    },
    sales: {
      background: isDark ? '#052e16' : '#f0fdf4',
      border: isDark ? '#166534' : '#bbf7d0',
      title: isDark ? '#86efac' : '#15803d',
      button: isDark ? '#14532d' : '#dcfce7',
    },
    recentExpenses: {
      background: isDark ? '#431407' : '#fff7ed',
      border: isDark ? '#9a3412' : '#fed7aa',
      title: isDark ? '#fdba74' : '#c2410c',
      button: isDark ? '#7c2d12' : '#ffedd5',
    },
  };

  const SummaryCard = ({
    title,
    value,
    theme,
  }) => (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: theme.background },
      ]}
    >
      <Text
        style={[
          styles.cardLabel,
          { color: colors.secondaryText },
        ]}
      >
        {title}
      </Text>

      <Text
        style={[
          styles.cardValue,
          { color: theme.text },
        ]}
      >
        {formatMoney(value)}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: colors.secondaryText },
          ]}
        >
          Loading dashboard...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <Text
        style={[
          styles.heading,
          { color: colors.text },
        ]}
      >
        Shop Dashboard
      </Text>

      <Text
        style={[
          styles.subtitle,
          { color: colors.secondaryText },
        ]}
      >
        Overview of your shop performance
      </Text>

      {/* FINANCIAL SUMMARY */}

      <View style={styles.cardGrid}>
        <SummaryCard
          title="Total Sales Revenue"
          value={data.revenue}
          theme={palette.revenue}
        />

        <SummaryCard
          title="Stock Value"
          value={data.stockValue}
          theme={palette.stock}
        />

        <SummaryCard
          title="Total Expenses"
          value={data.expenses}
          theme={palette.expenses}
        />

        <SummaryCard
          title="Net Profit"
          value={data.netProfit}
          theme={palette.profit}
        />
      </View>

      {/* BUSINESS SUMMARY */}

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: palette.business.background,
            borderColor: palette.business.border,
          },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: palette.business.title },
          ]}
        >
          Business Summary
        </Text>

        {[
          ['Total Products', String(data.totalProducts)],
          ['Gross Profit', formatMoney(data.grossProfit)],
          ['Operating Expenses', formatMoney(data.expenses)],
          ['Net Profit', formatMoney(data.netProfit)],
        ].map(([label, value]) => (
          <View
            key={label}
            style={[
              styles.detailRow,
              { borderBottomColor: palette.business.border },
            ]}
          >
            <Text
              style={[
                styles.infoLabel,
                { color: colors.secondaryText },
              ]}
            >
              {label}
            </Text>

            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    label === 'Net Profit'
                      ? data.netProfit >= 0
                        ? palette.profit.text
                        : palette.expenses.text
                      : colors.text,
                },
              ]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>

      {/* RECENT SALES */}

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: palette.sales.background,
            borderColor: palette.sales.border,
          },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: palette.sales.title },
          ]}
        >
          Recent Sales
        </Text>

        {data.recentSales.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: colors.secondaryText },
            ]}
          >
            No sales recorded yet.
          </Text>
        ) : (
          data.recentSales.map((sale) => (
            <View
              key={`${sale.id}-${sale.product_id}`}
              style={[
                styles.activityItem,
                { borderBottomColor: palette.sales.border },
              ]}
            >
              <Text
                style={[
                  styles.activityTitle,
                  { color: colors.text },
                ]}
              >
                {sale.product_name || 'Product'}
              </Text>

              <Text
                style={[
                  styles.activityDetail,
                  { color: colors.secondaryText },
                ]}
              >
                Quantity: {sale.quantity}
              </Text>

              <Text
                style={[
                  styles.amountText,
                  { color: palette.sales.title },
                ]}
              >
                {formatMoney(sale.total_amount)}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[
            styles.linkButton,
            { backgroundColor: palette.sales.button },
          ]}
          onPress={() => navigation.navigate('Sales')}
        >
          <Text
            style={[
              styles.linkText,
              { color: palette.sales.title },
            ]}
          >
            View Sales
          </Text>
        </TouchableOpacity>
      </View>

      {/* RECENT EXPENSES */}

      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: palette.recentExpenses.background,
            borderColor: palette.recentExpenses.border,
          },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: palette.recentExpenses.title },
          ]}
        >
          Recent Expenses
        </Text>

        {data.recentExpenses.length === 0 ? (
          <Text
            style={[
              styles.emptyText,
              { color: colors.secondaryText },
            ]}
          >
            No expenses recorded yet.
          </Text>
        ) : (
          data.recentExpenses.map((expense) => (
            <View
              key={expense.id}
              style={[
                styles.activityItem,
                {
                  borderBottomColor:
                    palette.recentExpenses.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.activityTitle,
                  { color: colors.text },
                ]}
              >
                {expense.title}
              </Text>

              <Text
                style={[
                  styles.activityDetail,
                  { color: colors.secondaryText },
                ]}
              >
                Category: {expense.category}
              </Text>

              <Text
                style={[
                  styles.amountText,
                  { color: palette.expenses.text },
                ]}
              >
                {formatMoney(expense.amount)}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity
          style={[
            styles.linkButton,
            {
              backgroundColor:
                palette.recentExpenses.button,
            },
          ]}
          onPress={() => navigation.navigate('Expenses')}
        >
          <Text
            style={[
              styles.linkText,
              { color: palette.recentExpenses.title },
            ]}
          >
            View Expenses
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 35 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  heading: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },

  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  summaryCard: {
    width: '48%',
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    minHeight: 105,
    justifyContent: 'center',
  },

  cardLabel: {
    fontSize: 13,
    marginBottom: 10,
  },

  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },

  infoCard: {
    padding: 18,
    borderRadius: 16,
    marginTop: 16,
    borderWidth: 1,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    gap: 12,
  },

  infoLabel: {
    flex: 1,
    fontSize: 14,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },

  activityItem: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },

  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  activityDetail: {
    fontSize: 14,
  },

  amountText: {
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 6,
  },

  emptyText: {
    marginVertical: 12,
  },

  linkButton: {
    marginTop: 16,
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
  },

  linkText: {
    fontWeight: 'bold',
    fontSize: 14,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
  },
});
