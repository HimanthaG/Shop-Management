
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';

import BackupButton from '../components/BackupButton';
import RestoreButton from '../components/RestoreButton';

export default function BackupRestoreScreen({
  onDatabaseRestored,
}) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>
        Backup & Restore
      </Text>

      <Text style={styles.subtitle}>
        Save your shop business records or import
        records into the current account.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Business Data Backup
        </Text>

        <Text style={styles.infoText}>
          Backups include products, stock,
          purchases, sales, and expenses.
        </Text>

        <Text style={styles.infoText}>
          Login details, passwords, user profiles,
          and shop profiles are not included.
        </Text>

        <Text style={styles.infoText}>
          Backup file format: SQLite (.db)
        </Text>
      </View>

      <BackupButton />

      <View style={styles.divider} />

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          Merge Restore
        </Text>

        <Text style={styles.infoText}>
          Import business records from a saved
          backup into your current account.
        </Text>

        <Text style={styles.infoText}>
          Existing records are kept. Imported
          products and transactions receive
          new database IDs.
        </Text>

        <Text style={styles.infoText}>
          The same backup cannot be imported
          twice into one account.
        </Text>
      </View>

      <RestoreButton
        onDatabaseRestored={onDatabaseRestored}
      />

      <Text style={styles.warning}>
        Important: Keep your backup files safe.
        Only import trusted business backups.
        Older full-database backups are not
        supported by Merge Restore.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 21,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 18,
  },
  warning: {
    fontSize: 12,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: 14,
    borderRadius: 10,
    lineHeight: 19,
    marginTop: 10,
  },
});
