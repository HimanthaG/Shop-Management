
import React, { useState, useRef } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';

import {
  selectAndValidateBackup,
  restoreValidatedBackup,
  clearPendingRestore,
} from '../services/restoreService';

export default function RestoreButton({
  onDatabaseRestored,
}) {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState('');

  const busyRef = useRef(false);

  const isAlreadyImported = (message) => {
    const text = String(message || '').toLowerCase();

    return (
      text.includes('already been imported') ||
      text.includes('already imported') ||
      text.includes('already inserted')
    );
  };

  const showAlreadyImported = () => {
    Alert.alert(
      'Already Imported',
      'This backup has already been imported into your account.\n\n' +
        'No changes were made to your existing data.',
      [{ text: 'OK' }]
    );
  };

  const handleActualRestore = async () => {
    if (busyRef.current) return;

    busyRef.current = true;
    setChecking(true);
    setStatus('Creating safety backup and importing records...');

    try {
      const result = await restoreValidatedBackup();

      if (!result.success) {
        throw new Error(
          'Business data import was not confirmed.'
        );
      }

      setStatus('Refreshing shop records...');

      if (typeof onDatabaseRestored === 'function') {
        await onDatabaseRestored();
      }

      Alert.alert(
        'Import Successful',
        `Backup: ${result.fileName}\n\n` +
          `Products: ${result.products}\n` +
          `Purchases: ${result.purchases}\n` +
          `Sales: ${result.sales}\n` +
          `Expenses: ${result.expenses}\n\n` +
          'Business records were added successfully.\n\n' +
          'Your existing records and account details were preserved.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      const message = error?.message || 'Unknown error.';

      if (isAlreadyImported(message)) {
        showAlreadyImported();
      } else {
        console.error(
          'BUSINESS IMPORT ERROR:',
          message
        );

        Alert.alert(
          'Import Failed',
          message +
            '\n\nYour existing data has not been intentionally replaced. ' +
            'Keep your backup files safe.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      busyRef.current = false;
      setChecking(false);
      setStatus('');
    }
  };

  const handleRestoreCheck = async () => {
    if (busyRef.current) return;

    busyRef.current = true;
    setChecking(true);
    setStatus('Checking business backup...');

    try {
      const result = await selectAndValidateBackup();

      if (result.canceled) return;

      if (!result.valid) {
        clearPendingRestore();

        Alert.alert(
          'Backup Not Supported',
          'Please select a valid business backup (.db).'
        );

        return;
      }

      Alert.alert(
        'Import Business Data',
        `Selected Backup:\n${result.fileName}\n\n` +
          `Products: ${result.products}\n` +
          `Purchases: ${result.purchases}\n` +
          `Sales: ${result.sales}\n` +
          `Expenses: ${result.expenses}\n\n` +
          'These records will be added to the current account.\n\n' +
          'Existing records, login details, and profiles will be preserved.\n\n' +
          'Continue with import?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: clearPendingRestore,
          },
          {
            text: 'Import',
            onPress: handleActualRestore,
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      clearPendingRestore();

      const message = error?.message || 'Unknown error.';

      if (isAlreadyImported(message)) {
        showAlreadyImported();
      } else {
        console.error(
          'BACKUP VALIDATION ERROR:',
          message
        );

        Alert.alert(
          'Unable to Read Backup',
          message,
          [{ text: 'OK' }]
        );
      }
    } finally {
      busyRef.current = false;
      setChecking(false);
      setStatus('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Import Business Data
      </Text>

      <Text style={styles.description}>
        Import products, purchases, sales, and expenses
        from a business backup into this account.
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          checking && styles.disabledButton,
        ]}
        onPress={handleRestoreCheck}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            Select Business Backup (.db)
          </Text>
        )}
      </TouchableOpacity>

      {checking && status ? (
        <Text style={styles.statusText}>
          {status}
        </Text>
      ) : null}

      <Text style={styles.note}>
        Existing business records are preserved.
        Backups that have already been imported
        will not be imported again.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginTop: 15,
    marginBottom: 15,
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 15,
    lineHeight: 21,
  },
  button: {
    backgroundColor: '#0f766e',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusText: {
    color: '#2563eb',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  note: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
});
