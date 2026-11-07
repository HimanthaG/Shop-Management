
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
  getProducts,
  createSale,
  getSales,
  getSalesSummary,
} from '../services/database';

export default function SalesScreen() {
  const { colors, isDark } = useAppTheme();

  const styles = createStyles(colors, isDark);

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // LOAD DATA

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        productData,
        salesData,
        summaryData,
      ] = await Promise.all([
        getProducts(),
        getSales(),
        getSalesSummary(),
      ]);

      setProducts(productData);
      setSales(salesData);
      setSummary(summaryData);

    } catch (error) {
      Alert.alert('Database Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  // SELECTED PRODUCT

  const selectedProduct = products.find(
    (product) => product.id === selectedProductId
  );

  const saleQuantity = Number(quantity);

  const estimatedTotal =
    selectedProduct &&
    Number.isSafeInteger(saleQuantity) &&
    saleQuantity > 0
      ? selectedProduct.selling_price * saleQuantity
      : 0;

  // COMPLETE SALE

  const saveSale = async () => {
    if (saving) return;

    if (!selectedProduct) {
      Alert.alert(
        'Validation Error',
        'Please select a product.'
      );
      return;
    }

    if (
      !quantity.trim() ||
      !Number.isSafeInteger(saleQuantity) ||
      saleQuantity <= 0
    ) {
      Alert.alert(
        'Validation Error',
        'Enter a valid sale quantity.'
      );
      return;
    }

    if (saleQuantity > selectedProduct.quantity) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${selectedProduct.quantity} units are available.`
      );
      return;
    }

    try {
      setSaving(true);

      const result = await createSale(
        selectedProduct.id,
        saleQuantity
      );

      setQuantity('');
      setSelectedProductId(null);

      await loadData();

      Alert.alert(
        'Sale Completed',
        `Product: ${result.productName}\n` +
        `Quantity: ${result.quantity}\n` +
        `Total: Rs. ${result.totalAmount.toFixed(2)}\n` +
        `Gross Profit: Rs. ${result.profit.toFixed(2)}`
      );

    } catch (error) {
      Alert.alert('Sale Error', error.message);
    } finally {
      setSaving(false);
    }
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
        Sales Management
      </Text>

      <Text style={styles.subtitle}>
        Record sales and monitor business revenue
      </Text>

      {/* REVENUE SUMMARY */}

      <View style={styles.summaryCard}>

        <Text style={styles.summaryTitle}>
          Total Revenue
        </Text>

        <Text style={styles.summaryAmount}>
          {formatMoney(summary?.revenue)}
        </Text>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryDetailsRow}>
          <View style={styles.summaryDetailBox}>
            <Text style={styles.summaryDetailLabel}>
              Total Sales
            </Text>

            <Text style={styles.summaryDetailValue}>
              {summary?.total_sales || 0}
            </Text>
          </View>

          <View style={styles.summaryDetailBox}>
            <Text style={styles.summaryDetailLabel}>
              Gross Profit
            </Text>

            <Text style={styles.summaryDetailValue}>
              {formatMoney(summary?.gross_profit)}
            </Text>
          </View>
        </View>

      </View>

      {/* NEW SALE SECTION */}

      <View style={styles.saleCard}>

        <View style={styles.sectionHeader}>
          <View style={styles.saleIndicator} />

          <Text style={styles.sectionTitle}>
            New Sale
          </Text>
        </View>

        <Text style={styles.label}>
          Select Product
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        ) : products.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              No products available.
              Add products in the Stock tab.
            </Text>
          </View>
        ) : (
          products.map((product) => {
            const isSelected =
              selectedProductId === product.id;

            const isOutOfStock =
              Number(product.quantity) === 0;

            return (
              <TouchableOpacity
                key={product.id}
                style={[
                  styles.productOption,
                  isSelected && styles.selectedOption,
                  isOutOfStock && styles.outOfStockOption,
                ]}
                disabled={isOutOfStock || saving}
                onPress={() => {
                  setSelectedProductId(product.id);
                  setQuantity('');
                }}
                activeOpacity={0.8}
              >

                <View style={styles.productInfo}>

                  <Text style={styles.productName}>
                    {product.name}
                  </Text>

                  <Text style={styles.productDetail}>
                    Available Stock: {product.quantity}
                  </Text>

                  <Text style={styles.productPrice}>
                    Selling Price: {formatMoney(product.selling_price)}
                  </Text>

                  {isOutOfStock && (
                    <Text style={styles.outOfStockText}>
                      Currently unavailable
                    </Text>
                  )}

                </View>

                <View
                  style={[
                    styles.radio,
                    isSelected && styles.selectedRadio,
                  ]}
                >
                  {isSelected && (
                    <View style={styles.radioInner} />
                  )}
                </View>

              </TouchableOpacity>
            );
          })
        )}

        {/* SALE FORM */}

        {selectedProduct && (
          <View style={styles.saleForm}>

            <View style={styles.selectedProductBanner}>
              <Text style={styles.selectedProductLabel}>
                Selected Product
              </Text>

              <Text style={styles.selectedProductName}>
                {selectedProduct.name}
              </Text>

              <Text style={styles.availableText}>
                {selectedProduct.quantity} units available
              </Text>
            </View>

            <Text style={styles.label}>
              Quantity to Sell
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              placeholderTextColor={colors.secondaryText}
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
              editable={!saving}
            />

            <View style={styles.totalBox}>

              <Text style={styles.totalLabel}>
                Estimated Total
              </Text>

              <Text style={styles.totalAmount}>
                {formatMoney(estimatedTotal)}
              </Text>

            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={saveSale}
              disabled={saving}
            >

              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>
                  Complete Sale
                </Text>
              )}

            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setSelectedProductId(null);
                setQuantity('');
              }}
              disabled={saving}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

          </View>
        )}

      </View>

      {/* SALES HISTORY */}

      <View style={styles.historyHeader}>
        <View style={styles.historyIndicator} />

        <Text style={styles.historySectionTitle}>
          Sales History
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : sales.length === 0 ? (
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyText}>
            No sales recorded yet.
          </Text>
        </View>
      ) : (
        sales.map((sale) => (
          <View
            key={sale.id}
            style={styles.historyCard}
          >

            <View style={styles.historyTopRow}>
              <Text style={styles.historyTitle}>
                Sale #{sale.id}
              </Text>

              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>
                  Completed
                </Text>
              </View>
            </View>

            <View style={styles.historyDivider} />

            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>
                Product
              </Text>

              <Text style={styles.historyValue}>
                {sale.product_name || 'Deleted Product'}
              </Text>
            </View>

            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>
                Quantity
              </Text>

              <Text style={styles.historyValue}>
                {sale.quantity} units
              </Text>
            </View>

            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>
                Revenue
              </Text>

              <Text style={styles.revenueValue}>
                {formatMoney(sale.total_amount)}
              </Text>
            </View>

            <View style={styles.historyRow}>
              <Text style={styles.historyLabel}>
                Gross Profit
              </Text>

              <Text style={styles.profitValue}>
                {formatMoney(sale.profit)}
              </Text>
            </View>

            <Text style={styles.dateText}>
              Date: {sale.created_at}
            </Text>

          </View>
        ))
      )}

      <View style={{ height: 35 }} />

    </ScrollView>
  );
}

// ========================================
// THEME-AWARE STYLES
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

    // REVENUE SUMMARY

    summaryCard: {
      backgroundColor: isDark ? '#153b2c' : '#dcfce7',
      padding: 20,
      borderRadius: 12,
      marginBottom: 20,
      borderLeftWidth: 4,
      borderLeftColor: '#16a34a',
    },

    summaryTitle: {
      fontSize: 15,
      color: isDark ? '#bbf7d0' : '#166534',
    },

    summaryAmount: {
      fontSize: 27,
      fontWeight: 'bold',
      color: isDark ? '#86efac' : '#15803d',
      marginVertical: 8,
    },

    summaryDivider: {
      height: 1,
      backgroundColor: isDark ? '#276044' : '#bbf7d0',
      marginVertical: 12,
    },

    summaryDetailsRow: {
      flexDirection: 'row',
      gap: 12,
    },

    summaryDetailBox: {
      flex: 1,
    },

    summaryDetailLabel: {
      fontSize: 13,
      color: isDark ? '#bbf7d0' : '#166534',
      marginBottom: 5,
    },

    summaryDetailValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#86efac' : '#15803d',
    },

    // NEW SALE

    saleCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 4,
      borderTopColor: '#2563eb',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    saleIndicator: {
      width: 5,
      height: 22,
      backgroundColor: '#2563eb',
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
      marginBottom: 10,
      color: colors.text,
    },

    // PRODUCT OPTIONS

    productOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 13,
      marginBottom: 10,
      backgroundColor: colors.surface,
    },

    selectedOption: {
      borderColor: '#3b82f6',
      backgroundColor: isDark ? '#172d49' : '#eff6ff',
      borderWidth: 2,
    },

    outOfStockOption: {
      opacity: 0.45,
    },

    productInfo: {
      flex: 1,
    },

    productName: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 5,
      color: colors.text,
    },

    productDetail: {
      color: colors.secondaryText,
      fontSize: 13,
      marginTop: 3,
    },

    productPrice: {
      color: isDark ? '#93c5fd' : '#1d4ed8',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 5,
    },

    outOfStockText: {
      color: isDark ? '#fca5a5' : '#dc2626',
      fontSize: 12,
      marginTop: 5,
      fontWeight: '600',
    },

    radio: {
      width: 23,
      height: 23,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.secondaryText,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },

    selectedRadio: {
      borderColor: '#2563eb',
    },

    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: '#2563eb',
    },

    // SALE FORM

    saleForm: {
      marginTop: 15,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    selectedProductBanner: {
      backgroundColor: isDark ? '#172d49' : '#eff6ff',
      padding: 13,
      borderRadius: 9,
      marginBottom: 17,
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
    },

    selectedProductLabel: {
      color: isDark ? '#bfdbfe' : '#1e40af',
      fontSize: 12,
      marginBottom: 5,
    },

    selectedProductName: {
      color: isDark ? '#93c5fd' : '#1d4ed8',
      fontWeight: 'bold',
      fontSize: 16,
    },

    availableText: {
      color: isDark ? '#bfdbfe' : '#1e40af',
      fontSize: 12,
      marginTop: 5,
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      padding: 13,
      fontSize: 16,
      marginBottom: 15,
      backgroundColor: colors.input,
      color: colors.text,
    },

    totalBox: {
      backgroundColor: isDark ? '#292044' : '#ede9fe',
      padding: 15,
      borderRadius: 9,
      marginBottom: 15,
      borderLeftWidth: 4,
      borderLeftColor: '#8b5cf6',
    },

    totalLabel: {
      fontSize: 13,
      color: isDark ? '#ddd6fe' : '#6d28d9',
      marginBottom: 5,
    },

    totalAmount: {
      fontSize: 23,
      fontWeight: 'bold',
      color: isDark ? '#c4b5fd' : '#6d28d9',
    },

    saveButton: {
      backgroundColor: '#16a34a',
      padding: 15,
      borderRadius: 10,
      alignItems: 'center',
    },

    disabledButton: {
      opacity: 0.6,
    },

    buttonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 15,
    },

    cancelButton: {
      padding: 13,
      alignItems: 'center',
      marginTop: 5,
    },

    cancelText: {
      color: colors.secondaryText,
      fontWeight: '600',
    },

    // SALES HISTORY

    historyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },

    historyIndicator: {
      width: 5,
      height: 23,
      backgroundColor: '#8b5cf6',
      borderRadius: 4,
      marginRight: 10,
    },

    historySectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },

    historyCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: '#8b5cf6',
    },

    historyTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },

    historyTitle: {
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text,
    },

    completedBadge: {
      backgroundColor: isDark ? '#153c2b' : '#dcfce7',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 7,
    },

    completedText: {
      fontSize: 11,
      fontWeight: 'bold',
      color: isDark ? '#86efac' : '#166534',
    },

    historyDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 12,
    },

    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      gap: 10,
    },

    historyLabel: {
      color: colors.secondaryText,
      fontSize: 14,
      flex: 1,
    },

    historyValue: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '500',
      textAlign: 'right',
      flex: 1,
    },

    revenueValue: {
      color: isDark ? '#86efac' : '#15803d',
      fontSize: 14,
      fontWeight: 'bold',
    },

    profitValue: {
      color: isDark ? '#c4b5fd' : '#7c3aed',
      fontSize: 14,
      fontWeight: 'bold',
    },

    dateText: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 12,
    },

    emptyBox: {
      backgroundColor: colors.surface,
      padding: 18,
      borderRadius: 9,
    },

    emptyHistory: {
      backgroundColor: colors.card,
      padding: 22,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },

    emptyText: {
      color: colors.secondaryText,
      textAlign: 'center',
      fontSize: 14,
      lineHeight: 21,
    },

    loader: {
      marginVertical: 20,
    },

  });
