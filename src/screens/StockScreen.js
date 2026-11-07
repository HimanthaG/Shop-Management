
import React, { useState, useCallback, useRef } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import { useAppTheme } from '../context/ThemeContext';

import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from '../services/database';

const LOW_STOCK_LIMIT = 5;

export default function StockScreen() {
  const { colors, isDark } = useAppTheme();

  const styles = createStyles(colors, isDark);

  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');

  const scrollRef = useRef(null);

  // LOAD PRODUCTS

  const loadProducts = async () => {
    try {
      setLoading(true);

      const data = await getProducts();

      setProducts(data);
    } catch (error) {
      Alert.alert('Database Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  // CLEAR FORM

  const clearForm = () => {
    setProductName('');
    setQuantity('');
    setCostPrice('');
    setSellingPrice('');
    setEditingId(null);
  };

  // SAVE PRODUCT

  const saveProduct = async () => {
    if (saving) return;

    const name = productName.trim();
    const qty = Number(quantity);
    const cost = Number(costPrice);
    const price = Number(sellingPrice);

    if (
      !name ||
      !quantity.trim() ||
      !costPrice.trim() ||
      !sellingPrice.trim()
    ) {
      Alert.alert(
        'Validation Error',
        'Please fill all fields.'
      );
      return;
    }

    if (
      !Number.isSafeInteger(qty) ||
      qty < 0 ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      Alert.alert(
        'Validation Error',
        'Enter a valid quantity and non-negative prices.'
      );
      return;
    }

    try {
      setSaving(true);

      if (editingId !== null) {
        await updateProduct(
          editingId,
          name,
          qty,
          cost,
          price
        );

        Alert.alert(
          'Success',
          'Product updated successfully.'
        );
      } else {
        await addProduct(
          name,
          qty,
          cost,
          price
        );

        Alert.alert(
          'Success',
          'Product saved successfully.'
        );
      }

      clearForm();

      await loadProducts();
    } catch (error) {
      Alert.alert('Database Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  // EDIT PRODUCT

  const editProduct = (product) => {
    setEditingId(product.id);
    setProductName(product.name);
    setQuantity(String(product.quantity));
    setCostPrice(String(product.cost_price));
    setSellingPrice(String(product.selling_price));

    scrollRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  // DELETE PRODUCT

  const removeProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete ${product.name}?`,
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
              await deleteProduct(product.id);

              if (editingId === product.id) {
                clearForm();
              }

              await loadProducts();

              Alert.alert(
                'Success',
                'Product deleted.'
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

  // STOCK CALCULATIONS

  const stockValue = products.reduce(
    (total, product) =>
      total +
      Number(product.quantity) *
        Number(product.cost_price),
    0
  );

  const outOfStockCount = products.filter(
    (product) => Number(product.quantity) === 0
  ).length;

  const lowStockCount = products.filter(
    (product) =>
      Number(product.quantity) > 0 &&
      Number(product.quantity) <= LOW_STOCK_LIMIT
  ).length;

  const totalAlerts =
    outOfStockCount + lowStockCount;

  const displayedProducts =
    filter === 'low'
      ? products.filter(
          (product) =>
            Number(product.quantity) <= LOW_STOCK_LIMIT
        )
      : products;

  // STOCK STATUS COLORS

  const getStockStatus = (qty) => {
    if (qty === 0) {
      return {
        label: 'Out of Stock',
        background: isDark ? '#451b24' : '#fee2e2',
        color: isDark ? '#fca5a5' : '#b91c1c',
      };
    }

    if (qty <= LOW_STOCK_LIMIT) {
      return {
        label: 'Low Stock',
        background: isDark ? '#493518' : '#fef3c7',
        color: isDark ? '#fcd34d' : '#92400e',
      };
    }

    return {
      label: 'Available',
      background: isDark ? '#153c2b' : '#dcfce7',
      color: isDark ? '#86efac' : '#166534',
    };
  };

  // SCREEN

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.heading}>
        Stock Management
      </Text>

      <Text style={styles.subtitle}>
        Manage products and monitor stock levels
      </Text>

      {/* STOCK SUMMARY */}

      <View style={styles.summaryRow}>
        <View style={styles.productSummary}>
          <Text style={styles.summaryLabel}>
            Total Products
          </Text>

          <Text style={styles.summaryNumber}>
            {products.length}
          </Text>
        </View>

        <View style={styles.alertSummary}>
          <Text style={styles.summaryLabel}>
            Stock Alerts
          </Text>

          <Text style={styles.alertNumber}>
            {totalAlerts}
          </Text>
        </View>
      </View>

      {/* STOCK VALUE */}

      <View style={styles.stockValueCard}>
        <Text style={styles.stockValueLabel}>
          Total Stock Value
        </Text>

        <Text style={styles.stockValue}>
          Rs. {stockValue.toFixed(2)}
        </Text>
      </View>

      {/* STOCK ALERT */}

      {totalAlerts > 0 && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => setFilter('low')}
          activeOpacity={0.8}
        >
          <Text style={styles.alertTitle}>
            Stock Attention Required
          </Text>

          <Text style={styles.alertDescription}>
            {lowStockCount} low stock and{' '}
            {outOfStockCount} out of stock products.
            Tap to view.
          </Text>
        </TouchableOpacity>
      )}

      {/* ADD OR EDIT PRODUCT */}

      <View style={styles.formCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIndicator} />

          <Text style={styles.cardTitle}>
            {editingId !== null
              ? 'Edit Product'
              : 'Add Product'}
          </Text>
        </View>

        <Text style={styles.inputLabel}>
          Product Name
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter product name"
          placeholderTextColor={colors.secondaryText}
          value={productName}
          onChangeText={setProductName}
          editable={!saving}
        />

        <Text style={styles.inputLabel}>
          Quantity
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

        <Text style={styles.inputLabel}>
          Purchase Cost (Rs.)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter purchase cost"
          placeholderTextColor={colors.secondaryText}
          keyboardType="decimal-pad"
          value={costPrice}
          onChangeText={setCostPrice}
          editable={!saving}
        />

        <Text style={styles.inputLabel}>
          Selling Price (Rs.)
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter selling price"
          placeholderTextColor={colors.secondaryText}
          keyboardType="decimal-pad"
          value={sellingPrice}
          onChangeText={setSellingPrice}
          editable={!saving}
        />

        <TouchableOpacity
          style={[
            styles.button,
            saving && styles.disabledButton,
          ]}
          onPress={saveProduct}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>
              {editingId !== null
                ? 'Update Product'
                : 'Add Product'}
            </Text>
          )}
        </TouchableOpacity>

        {editingId !== null && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={clearForm}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              Cancel Edit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* PRODUCT LIST */}

      <View style={styles.productsHeader}>
        <View style={styles.productsIndicator} />

        <Text style={styles.sectionTitle}>
          Products
        </Text>
      </View>

      {/* FILTER */}

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && styles.activeFilter,
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'all' && styles.activeFilterText,
            ]}
          >
            All Products
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'low' && styles.activeLowFilter,
          ]}
          onPress={() => setFilter('low')}
        >
          <Text
            style={[
              styles.filterText,
              filter === 'low' && styles.activeFilterText,
            ]}
          >
            Low Stock ({totalAlerts})
          </Text>
        </TouchableOpacity>
      </View>

      {/* PRODUCT RECORDS */}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : displayedProducts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {filter === 'low'
              ? 'All products have sufficient stock.'
              : 'No products added yet.'}
          </Text>
        </View>
      ) : (
        displayedProducts.map((product) => {
          const qty = Number(product.quantity);
          const status = getStockStatus(qty);

          return (
            <View
              key={product.id}
              style={styles.productCard}
            >
              <View style={styles.productHeader}>
                <Text style={styles.productName}>
                  {product.name}
                </Text>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: status.background,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: status.color },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
              </View>

              <View style={styles.quantityBox}>
                <Text style={styles.quantityLabel}>
                  Available Quantity
                </Text>

                <Text style={styles.quantityText}>
                  {qty} units
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Purchase Cost
                </Text>

                <Text style={styles.detailValue}>
                  Rs. {Number(product.cost_price).toFixed(2)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  Selling Price
                </Text>

                <Text style={styles.detailValue}>
                  Rs. {Number(product.selling_price).toFixed(2)}
                </Text>
              </View>

              {qty <= LOW_STOCK_LIMIT && (
                <View style={styles.restockBox}>
                  <Text style={styles.restockText}>
                    Suggested Restock: At least{' '}
                    {LOW_STOCK_LIMIT + 1 - qty} units
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => editProduct(product)}
                >
                  <Text style={styles.buttonText}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeProduct(product)}
                >
                  <Text style={styles.buttonText}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
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
      padding: 16,
      backgroundColor: colors.background,
    },

    scrollContent: {
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

    summaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },

    productSummary: {
      flex: 1,
      backgroundColor: isDark ? '#172d49' : '#dbeafe',
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#3b82f6',
    },

    alertSummary: {
      flex: 1,
      backgroundColor: isDark ? '#442d19' : '#fef3c7',
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#f59e0b',
    },

    summaryLabel: {
      fontSize: 13,
      color: isDark ? '#cbd5e1' : '#475569',
      marginBottom: 8,
    },

    summaryNumber: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#93c5fd' : '#1d4ed8',
    },

    alertNumber: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#fcd34d' : '#b45309',
    },

    stockValueCard: {
      backgroundColor: isDark ? '#292044' : '#ede9fe',
      padding: 17,
      borderRadius: 12,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#8b5cf6',
    },

    stockValueLabel: {
      fontSize: 13,
      color: isDark ? '#ddd6fe' : '#6d28d9',
      marginBottom: 8,
    },

    stockValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: isDark ? '#c4b5fd' : '#6d28d9',
    },

    alertBanner: {
      backgroundColor: isDark ? '#493518' : '#fef3c7',
      padding: 15,
      borderRadius: 12,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#f59e0b',
    },

    alertTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: isDark ? '#fcd34d' : '#92400e',
      marginBottom: 5,
    },

    alertDescription: {
      fontSize: 13,
      color: isDark ? '#fde68a' : '#92400e',
      lineHeight: 20,
    },

    formCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 22,
      borderWidth: 1,
      borderColor: colors.border,
      borderTopWidth: 4,
      borderTopColor: '#3b82f6',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },

    sectionIndicator: {
      width: 5,
      height: 22,
      borderRadius: 4,
      backgroundColor: '#3b82f6',
      marginRight: 10,
    },

    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },

    inputLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 7,
    },

    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 9,
      padding: 12,
      marginBottom: 15,
      fontSize: 15,
      backgroundColor: colors.input,
      color: colors.text,
    },

    button: {
      backgroundColor: '#2563eb',
      padding: 15,
      borderRadius: 9,
      alignItems: 'center',
      marginTop: 3,
    },

    disabledButton: {
      opacity: 0.6,
    },

    cancelButton: {
      backgroundColor: '#64748b',
      padding: 14,
      borderRadius: 9,
      alignItems: 'center',
      marginTop: 10,
    },

    buttonText: {
      color: '#ffffff',
      fontWeight: 'bold',
      fontSize: 14,
    },

    productsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 13,
    },

    productsIndicator: {
      width: 5,
      height: 23,
      backgroundColor: '#0d9488',
      borderRadius: 4,
      marginRight: 10,
    },

    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },

    filterRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 15,
    },

    filterButton: {
      flex: 1,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 9,
      borderWidth: 1,
      borderColor: colors.border,
    },

    activeFilter: {
      backgroundColor: '#2563eb',
      borderColor: '#2563eb',
    },

    activeLowFilter: {
      backgroundColor: '#d97706',
      borderColor: '#d97706',
    },

    filterText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '600',
    },

    activeFilterText: {
      color: '#ffffff',
    },

    productCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 13,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderLeftColor: '#0d9488',
    },

    productHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 12,
    },

    productName: {
      flex: 1,
      fontSize: 17,
      fontWeight: 'bold',
      color: colors.text,
    },

    statusBadge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
    },

    statusText: {
      fontSize: 11,
      fontWeight: 'bold',
    },

    quantityBox: {
      backgroundColor: isDark ? '#172d49' : '#eff6ff',
      padding: 12,
      borderRadius: 9,
      marginBottom: 12,
    },

    quantityLabel: {
      color: isDark ? '#bfdbfe' : '#1e40af',
      fontSize: 12,
      marginBottom: 4,
    },

    quantityText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#93c5fd' : '#1d4ed8',
    },

    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    detailLabel: {
      fontSize: 14,
      color: colors.secondaryText,
    },

    detailValue: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },

    restockBox: {
      backgroundColor: isDark ? '#493518' : '#fef3c7',
      padding: 10,
      borderRadius: 8,
      marginTop: 12,
    },

    restockText: {
      fontSize: 13,
      color: isDark ? '#fcd34d' : '#b45309',
      fontWeight: '600',
    },

    actionRow: {
      flexDirection: 'row',
      marginTop: 15,
      gap: 10,
    },

    editButton: {
      backgroundColor: '#16a34a',
      padding: 13,
      borderRadius: 8,
      flex: 1,
      alignItems: 'center',
    },

    deleteButton: {
      backgroundColor: '#dc2626',
      padding: 13,
      borderRadius: 8,
      flex: 1,
      alignItems: 'center',
    },

    emptyCard: {
      backgroundColor: colors.card,
      padding: 22,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },

    emptyText: {
      textAlign: 'center',
      color: colors.secondaryText,
      fontSize: 14,
    },

    loader: {
      marginVertical: 25,
    },
  });
