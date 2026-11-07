
import React, { useState, useCallback } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { useAppTheme } from '../context/ThemeContext';

import {
  addExpense,
  getExpenses,
  deleteExpense,
  getExpenseSummary,
} from '../services/database';

const categories = [
  'Electricity',
  'Rent',
  'Transport',
  'Salary',
  'Water',
  'Maintenance',
  'Other',
];

export default function ExpensesScreen() {
  const { colors, isDark } = useAppTheme();

  const styles = createStyles(colors, isDark);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // LOAD EXPENSES

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const [
        expenseData,
        summaryData,
      ] = await Promise.all([
        getExpenses(),
        getExpenseSummary(),
      ]);

      setExpenses(expenseData);
      setSummary(summaryData);

    } catch (error) {
      Alert.alert('Database Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  // SAVE EXPENSE

  const saveExpense = async () => {
    if (saving) return;

    const expenseTitle = title.trim();
    const expenseAmount = Number(amount);

    if (!expenseTitle || !amount.trim()) {
      Alert.alert(
        'Validation Error',
        'Please enter the expense title and amount.'
      );
      return;
    }

    if (
      !Number.isFinite(expenseAmount) ||
      expenseAmount <= 0
    ) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid amount greater than zero.'
      );
      return;
    }

    try {
      setSaving(true);

      await addExpense(
        expenseTitle,
        expenseAmount,
        category
      );

      setTitle('');
      setAmount('');
      setCategory('Other');

      await loadExpenses();

      Alert.alert(
        'Success',
        'Expense saved successfully.'
      );

    } catch (error) {
      Alert.alert('Database Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // DELETE EXPENSE

  const removeExpense = (expense) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete "${expense.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',

          onPress: async () => {
            try {
              await deleteExpense(expense.id);

              await loadExpenses();

              Alert.alert(
                'Success',
                'Expense deleted successfully.'
              );

            } catch (error) {
              Alert.alert(
                'Database Error',
                error.message
              );
            }
          },
        },
      ]
    );
  };

  // MONEY FORMAT

  const formatMoney = (value) =>
    `Rs. ${Number(value || 0).toFixed(2)}`;

  // SCREEN

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >

      <Text style={styles.heading}>
        Expense Management
      </Text>

      <Text style={styles.subtitle}>
        Record and monitor your business expenses
      </Text>

      {/* EXPENSE SUMMARY */}

      <View style={styles.summaryCard}>

        <Text style={styles.summaryLabel}>
          Total Expenses
        </Text>

        <Text style={styles.summaryAmount}>
          {formatMoney(summary?.total_amount)}
        </Text>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryBottom}>
          <Text style={styles.summaryDetail}>
            Recorded Expenses
          </Text>

          <Text style={styles.summaryCount}>
            {summary?.total_expenses || 0}
          </Text>
        </View>

      </View>

      {/* ADD EXPENSE SECTION */}

      <View style={styles.formCard}>

        <View style={styles.sectionHeader}>
          <View style={styles.formIndicator} />

          <Text style={styles.sectionTitle}>
            Add New Expense
          </Text>
        </View>

        <Text style={styles.label}>
          Expense Title
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Example: Monthly Electricity Bill"
          placeholderTextColor={colors.secondaryText}
          value={title}
          onChangeText={setTitle}
          editable={!saving}
          maxLength={150}
        />

        <Text style={styles.label}>
          Amount (Rs.)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          placeholderTextColor={colors.secondaryText}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          editable={!saving}
        />

        <Text style={styles.label}>
          Expense Category
        </Text>

        <View style={styles.categoryContainer}>
          {categories.map((item) => {
            const selected = category === item;

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.categoryButton,
                  selected && styles.selectedCategory,
                ]}
                onPress={() => setCategory(item)}
                disabled={saving}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selected && styles.selectedCategoryText,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && styles.disabledButton,
          ]}
          onPress={saveExpense}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>
              Save Expense
            </Text>
          )}
        </TouchableOpacity>

      </View>

      {/* EXPENSE HISTORY */}

      <View style={styles.historyHeader}>
        <View style={styles.historyIndicator} />

        <Text style={styles.historySectionTitle}>
          Expense History
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : expenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No expenses recorded yet.
          </Text>
        </View>
      ) : (
        expenses.map((expense) => (
          <View
            key={expense.id}
            style={styles.expenseCard}
          >

            <View style={styles.expenseHeader}>
              <Text style={styles.expenseTitle}>
                {expense.title}
              </Text>

              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {expense.category || 'Other'}
                </Text>
              </View>
            </View>

            <View style={styles.historyDivider} />

            <Text style={styles.expenseAmount}>
              {formatMoney(expense.amount)}
            </Text>

            <Text style={styles.dateText}>
              Date: {expense.created_at}
            </Text>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => removeExpense(expense)}
            >
              <Text style={styles.deleteButtonText}>
                Delete Expense
              </Text>
            </TouchableOpacity>

          </View>
        ))
      )}

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

    scrollContent: {
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

    // EXPENSE SUMMARY

    summaryCard: {
      backgroundColor: isDark ? '#421f27' : '#fee2e2',
      padding: 20,
      borderRadius: 12,
      marginBottom: 22,
      borderLeftWidth: 4,
      borderLeftColor: '#dc2626',
    },

    summaryLabel: {
      fontSize: 15,
      color: isDark ? '#fecaca' : '#991b1b',
    },

    summaryAmount: {
      fontSize: 27,
      fontWeight: 'bold',
      color: isDark ? '#fca5a5' : '#dc2626',
      marginVertical: 8,
    },

    summaryDivider: {
      height: 1,
      backgroundColor: isDark ? '#71333d' : '#fecaca',
      marginVertical: 12,
    },

    summaryBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    summaryDetail: {
      fontSize: 13,
      color: isDark ? '#fecaca' : '#991b1b',
    },

    summaryCount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#fca5a5' : '#dc2626',
    },

    // ADD EXPENSE FORM

    formCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 4,
      borderTopColor: '#f97316',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    formIndicator: {
      width: 5,
      height: 22,
      backgroundColor: '#f97316',
      borderRadius: 4,
      marginRight: 10,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },

    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      padding: 13,
      fontSize: 15,
      marginBottom: 17,
      backgroundColor: colors.input,
      color: colors.text,
    },

    // CATEGORY SELECTION

    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 18,
    },

    categoryButton: {
      paddingVertical: 10,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
      backgroundColor: colors.surface,
    },

    selectedCategory: {
      backgroundColor: isDark ? '#422b17' : '#ffedd5',
      borderColor: '#f97316',
      borderWidth: 1.5,
    },

    categoryText: {
      color: colors.secondaryText,
      fontSize: 13,
    },

    selectedCategoryText: {
      color: isDark ? '#fdba74' : '#c2410c',
      fontWeight: 'bold',
    },

    // SAVE BUTTON

    saveButton: {
      backgroundColor: '#ea580c',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },

    disabledButton: {
      opacity: 0.6,
    },

    saveButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 16,
    },

    // HISTORY

    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },

    historyIndicator: {
      width: 5,
      height: 23,
      backgroundColor: '#dc2626',
      borderRadius: 4,
      marginRight: 10,
    },

    historySectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },

    expenseCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: '#dc2626',
    },

    expenseHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },

    expenseTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },

    categoryBadge: {
      backgroundColor: isDark ? '#352650' : '#ede9fe',
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 7,
    },

    categoryBadgeText: {
      color: isDark ? '#c4b5fd' : '#6d28d9',
      fontSize: 11,
      fontWeight: '600',
    },

    historyDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },

    expenseAmount: {
      fontSize: 21,
      fontWeight: 'bold',
      color: isDark ? '#fca5a5' : '#dc2626',
      marginBottom: 7,
    },

    dateText: {
      color: colors.secondaryText,
      fontSize: 12,
      marginBottom: 14,
    },

    deleteButton: {
      backgroundColor: '#dc2626',
      padding: 11,
      borderRadius: 8,
      alignItems: 'center',
    },

    deleteButtonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 14,
    },

    emptyCard: {
      backgroundColor: colors.card,
      padding: 22,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },

    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      fontSize: 14,
    },

    loader: {
      marginVertical: 20,
    },

  });
