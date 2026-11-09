
import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  resetAccountData,
  deleteCurrentAccount,
} from '../services/accountManagementService';

import { useAppTheme } from '../context/ThemeContext';

export default function AccountManagementScreen({
  accountUser,
  onAccountDeleted,
}) {
  const { isDark, colors } = useAppTheme();

  const [actionType, setActionType] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [processing, setProcessing] = useState(false);

  const isReset = actionType === 'reset';
  const isDelete = actionType === 'delete';

  const requiredWord = isReset ? 'RESET' : 'DELETE';

  const actionValid =
    (isReset || isDelete) &&
    password.length > 0 &&
    confirmationText.trim() === requiredWord;

  const danger = '#dc2626';

  // ========================================
  // OPEN ACTION
  // ========================================

  const openAction = (type) => {
    setPassword('');
    setConfirmationText('');
    setActionType(type);
  };

  const closeAction = () => {
    if (processing) return;

    setActionType(null);
    setPassword('');
    setConfirmationText('');
  };

  // ========================================
  // RESET ACCOUNT DATA
  // ========================================

  const executeReset = async () => {
    if (processing || !actionValid || !isReset) return;

    setProcessing(true);

    try {
      const result = await resetAccountData(password);

      if (!result?.success) {
        throw new Error('Account reset was unsuccessful.');
      }

      setActionType(null);
      setPassword('');
      setConfirmationText('');

      Alert.alert(
        'Reset Successful',
        'Your account business data has been reset successfully.\n\nShop Information, Shop Logo and Login Details have been kept.'
      );
    } catch (error) {
      Alert.alert(
        'Reset Failed',
        error.message || 'Unable to reset account data.'
      );
    } finally {
      setProcessing(false);
    }
  };

  // ========================================
  // DELETE ACCOUNT
  // ========================================

  const executeDelete = async () => {
    if (processing || !actionValid || !isDelete) return;

    setProcessing(true);

    try {
      const result = await deleteCurrentAccount(password);

      if (!result?.success) {
        throw new Error('Account deletion was unsuccessful.');
      }

      setActionType(null);
      setPassword('');
      setConfirmationText('');

      if (typeof onAccountDeleted === 'function') {
        onAccountDeleted();
      }
    } catch (error) {
      Alert.alert(
        'Delete Account Failed',
        error.message || 'Unable to delete account.'
      );
    } finally {
      setProcessing(false);
    }
  };

  // ========================================
  // FINAL CONFIRMATION
  // ========================================

  const handleContinue = () => {
    if (!actionValid || processing) return;

    if (isReset) {
      Alert.alert(
        'Final Reset Confirmation',
        'Are you sure you want to reset all business data belonging to this account?\n\nShop Information, Shop Logo and Login Details will remain.\n\nA safety backup will be created first.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Reset Data',
            style: 'destructive',
            onPress: executeReset,
          },
        ]
      );
    } else if (isDelete) {
      Alert.alert(
        'Final Delete Confirmation',
        'Are you sure you want to permanently delete this account?\n\nBusiness records, Shop Information, Shop Logo and Login Details will be deleted.\n\nA safety backup will be created first.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete Account',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  };

  // ========================================
  // ACTION CARD
  // ========================================

  const renderActionCard = (
    title,
    description,
    icon,
    type
  ) => (
    <View
      style={[
        styles.actionCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDark
                ? '#451a1a'
                : '#fee2e2',
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={27}
            color={danger}
          />
        </View>

        <View style={styles.cardTitleContainer}>
          <Text
            style={[
              styles.cardTitle,
              { color: colors.text },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.cardDescription,
              { color: colors.secondaryText },
            ]}
          >
            {description}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.passwordNotice,
          {
            backgroundColor: isDark
              ? '#334155'
              : '#f1f5f9',
          },
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={15}
          color={colors.secondaryText}
        />

        <Text
          style={[
            styles.noticeText,
            { color: colors.secondaryText },
          ]}
        >
          Password verification required
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: danger },
        ]}
        onPress={() => openAction(type)}
      >
        <Text style={styles.actionButtonText}>
          {title}
        </Text>

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#ffffff"
        />
      </TouchableOpacity>
    </View>
  );

  // ========================================
  // SCREEN
  // ========================================

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[
            styles.heading,
            { color: colors.text },
          ]}
        >
          Account Management
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.secondaryText },
          ]}
        >
          Manage your account data and account settings.
        </Text>

        {/* CURRENT ACCOUNT */}

        <View
          style={[
            styles.accountCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="person-circle-outline"
            size={30}
            color={colors.primary}
          />

          <View style={styles.accountInfo}>
            <Text
              style={[
                styles.accountName,
                { color: colors.text },
              ]}
            >
              {accountUser?.fullName || 'Account'}
            </Text>

            <Text
              style={[
                styles.accountEmail,
                { color: colors.secondaryText },
              ]}
            >
              {accountUser?.email || ''}
            </Text>
          </View>
        </View>

        {/* RESET */}

        {renderActionCard(
          'Reset Account Data',
          'Remove products, purchases, sales and expenses. Keep Shop Information, Shop Logo and Login Details.',
          'refresh-circle-outline',
          'reset'
        )}

        {/* DELETE */}

        {renderActionCard(
          'Delete Account',
          'Permanently delete this account, its business records, Shop Information and Login Details.',
          'trash-outline',
          'delete'
        )}

        {/* IMPORTANT INFORMATION */}

        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: isDark
                ? '#422006'
                : '#fef3c7',
            },
          ]}
        >
          <Ionicons
            name="warning-outline"
            size={21}
            color={isDark ? '#fcd34d' : '#92400e'}
          />

          <View style={styles.warningContent}>
            <Text
              style={[
                styles.warningTitle,
                {
                  color: isDark ? '#fde68a' : '#92400e',
                },
              ]}
            >
              Important
            </Text>

            <Text
              style={[
                styles.warningText,
                {
                  color: isDark ? '#fcd34d' : '#92400e',
                },
              ]}
            >
              These operations affect only the currently
              logged-in account. A safety backup is
              created before either operation.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ================================== */}
      {/* PASSWORD CONFIRMATION MODAL */}
      {/* ================================== */}

      <Modal
        visible={actionType !== null}
        transparent
        animationType="fade"
        onRequestClose={closeAction}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios' ? 'padding' : undefined
          }
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalContent}
            >
              <Ionicons
                name={
                  isReset
                    ? 'refresh-circle-outline'
                    : 'trash-outline'
                }
                size={42}
                color={danger}
                style={styles.modalIcon}
              />

              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.text },
                ]}
              >
                {isReset
                  ? 'Reset Account Data'
                  : 'Delete Account'}
              </Text>

              <Text
                style={[
                  styles.modalDescription,
                  { color: colors.secondaryText },
                ]}
              >
                Enter your login password and type{' '}
                {requiredWord} to continue.
              </Text>

              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.text },
                ]}
              >
                Login Password
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Enter your password"
                placeholderTextColor={colors.secondaryText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!processing}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.text },
                ]}
              >
                Type {requiredWord} to confirm
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={requiredWord}
                placeholderTextColor={colors.secondaryText}
                value={confirmationText}
                onChangeText={setConfirmationText}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!processing}
              />

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  { backgroundColor: danger },
                  (!actionValid || processing) &&
                    styles.disabledButton,
                ]}
                onPress={handleContinue}
                disabled={!actionValid || processing}
              >
                {processing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Continue
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeAction}
                disabled={processing}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: colors.secondaryText },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  accountEmail: {
    fontSize: 13,
    marginTop: 4,
  },

  actionCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitleContainer: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 7,
  },

  cardDescription: {
    fontSize: 13,
    lineHeight: 20,
  },

  passwordNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },

  noticeText: {
    fontSize: 12,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 9,
    marginTop: 14,
    gap: 8,
  },

  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    gap: 10,
  },

  warningContent: {
    flex: 1,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },

  warningText: {
    fontSize: 12,
    lineHeight: 19,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },

  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
  },

  modalContent: {
    padding: 22,
  },

  modalIcon: {
    alignSelf: 'center',
    marginBottom: 12,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },

  modalDescription: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 18,
    minHeight: 48,
  },

  confirmButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },

  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  disabledButton: {
    opacity: 0.45,
  },

  cancelButton: {
    padding: 14,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
