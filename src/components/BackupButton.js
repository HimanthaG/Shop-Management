
import React, { useState } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';

import {
  createDatabaseBackup,
} from '../services/backupService';

export default function BackupButton() {
  const [backingUp, setBackingUp] = useState(false);

  const handleBackup = async () => {
    if (backingUp) return;

    try {
      setBackingUp(true);

      await createDatabaseBackup();

      Alert.alert(
        'Backup Export',
        'The sharing menu has closed. Please check the Files app to confirm that your backup was saved.'
      );
    } catch (error) {
      Alert.alert(
        'Backup Error',
        error.message
      );
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Database Backup
      </Text>

      <Text style={styles.description}>
        Export a copy of your shop records and
        save it to a safe location.
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          backingUp && styles.disabledButton,
        ]}
        onPress={handleBackup}
        disabled={backingUp}
      >
        {backingUp ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>
            Backup Database
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        After tapping the button, choose
        Save to Files and confirm the file
        is stored successfully.
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
    backgroundColor: '#2563eb',
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
  note: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 18,
  },
});
