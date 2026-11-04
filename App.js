
import React, {
  useEffect,
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  ScrollView,
} from 'react-native';

import AppNavigator from './src/navigation/AppNavigator';

import {
  initializeDatabase,
  getDatabase,
} from './src/services/database';

import {
  initializeAuthDatabase,
} from './src/services/authService';

import {
  migrateAccountOwnership,
} from './src/services/accountMigration';

import {
  ThemeProvider,
  useAppTheme,
} from './src/context/ThemeContext';

// ========================================
// MAIN APPLICATION
// ========================================

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

// ========================================
// APPLICATION CONTENT
// ========================================

function AppContent() {
  const {
    isDark,
    colors,
    loadingTheme,
  } = useAppTheme();

  const [databaseReady, setDatabaseReady] =
    useState(false);

  const [databaseError, setDatabaseError] =
    useState(null);

  const [databaseVersion, setDatabaseVersion] =
    useState(0);

  const [currentStep, setCurrentStep] =
    useState('Starting application');

  // ========================================
  // DATABASE INITIALIZATION
  // ========================================

  const setupDatabase = useCallback(async () => {
    let step = 'Starting database initialization';

    try {
      setDatabaseReady(false);
      setDatabaseError(null);

      // ====================================
      // STEP 1: SHOP DATABASE
      // ====================================

      step = 'Shop Database Initialization';

      setCurrentStep(step);

      console.log('STEP 1 START:', step);

      await initializeDatabase();

      console.log('STEP 1 SUCCESS');

      // ====================================
      // STEP 2: AUTH DATABASE
      // ====================================

      step = 'Authentication Database Initialization';

      setCurrentStep(step);

      console.log('STEP 2 START:', step);

      console.log(
        'initializeAuthDatabase type:',
        typeof initializeAuthDatabase
      );

      await initializeAuthDatabase();

      console.log('STEP 2 SUCCESS');

      // ====================================
      // STEP 3: ACCOUNT DIAGNOSTIC
      // ====================================

      step = 'Registered Accounts Check';

      setCurrentStep(step);

      console.log('STEP 3 START:', step);

      const db = await getDatabase();

      console.log(
        'getAllAsync type:',
        typeof db.getAllAsync
      );

      const accounts = await db.getAllAsync(
        `SELECT id, email
         FROM auth_users
         ORDER BY id`
      );

      console.log(
        'LOCAL REGISTERED ACCOUNTS:',
        JSON.stringify(accounts)
      );

      console.log(
        'TOTAL LOCAL ACCOUNTS:',
        accounts.length
      );

      console.log('STEP 3 SUCCESS');

      // ====================================
      // STEP 4: ACCOUNT MIGRATION
      // ====================================

      step = 'Account Ownership Migration';

      setCurrentStep(step);

      console.log('STEP 4 START:', step);

      console.log(
        'migrateAccountOwnership type:',
        typeof migrateAccountOwnership
      );

      await migrateAccountOwnership();

      console.log('STEP 4 SUCCESS');

      // ====================================
      // STEP 5: READY
      // ====================================

      step = 'Application Ready';

      setCurrentStep(step);

      setDatabaseVersion(
        (previous) => previous + 1
      );

      setDatabaseReady(true);

      console.log(
        'SUCCESS: Shop database, authentication, ' +
        'and account migration are ready.'
      );

    } catch (error) {
      console.error(
        '================================'
      );

      console.error(
        'DATABASE INITIALIZATION FAILED'
      );

      console.error(
        'FAILED STEP:',
        step
      );

      console.error(
        'ERROR NAME:',
        error?.name
      );

      console.error(
        'ERROR MESSAGE:',
        error?.message
      );

      console.error(
        'ERROR STACK:',
        error?.stack
      );

      console.error(
        '================================'
      );

      setCurrentStep(step);

      setDatabaseError(
        error?.message ||
        String(error) ||
        'Unable to initialize database.'
      );
    }
  }, []);

  useEffect(() => {
    setupDatabase();
  }, [setupDatabase]);

  // ========================================
  // THEME STYLES
  // ========================================

  const containerStyle = [
    styles.container,
    {
      backgroundColor: colors.background,
    },
  ];

  const normalTextStyle = {
    color: colors.secondaryText,
  };

  // ========================================
  // STATUS BAR
  // ========================================

  const appStatusBar = (
    <StatusBar
      barStyle={
        isDark ? 'light-content' : 'dark-content'
      }
      backgroundColor={colors.background}
    />
  );

  // ========================================
  // DATABASE ERROR SCREEN
  // ========================================

  if (databaseError) {
    return (
      <View style={containerStyle}>
        {appStatusBar}

        <ScrollView
          contentContainerStyle={
            styles.errorContainer
          }
        >
          <Text style={styles.errorTitle}>
            Database Error
          </Text>

          <Text
            style={[
              styles.stepTitle,
              { color: colors.primary },
            ]}
          >
            Failed Step:
          </Text>

          <Text
            style={[
              styles.stepText,
              normalTextStyle,
            ]}
          >
            {currentStep}
          </Text>

          <Text
            style={[
              styles.errorText,
              normalTextStyle,
            ]}
          >
            {databaseError}
          </Text>

          <Text
            style={[
              styles.helpText,
              normalTextStyle,
            ]}
          >
            Check the Expo Terminal for
            detailed error information.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (!databaseReady || loadingTheme) {
    return (
      <View style={containerStyle}>
        {appStatusBar}

        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            normalTextStyle,
          ]}
        >
          Preparing Shop Database...
        </Text>

        <Text
          style={[
            styles.stepText,
            normalTextStyle,
          ]}
        >
          {currentStep}
        </Text>
      </View>
    );
  }

  // ========================================
  // APP NAVIGATION
  // ========================================

  return (
    <>
      {appStatusBar}

      <AppNavigator
        key={databaseVersion}
        onDatabaseRestored={setupDatabase}
      />
    </>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },

  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },

  stepText: {
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },

  errorContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 20,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
    lineHeight: 23,
  },

  helpText: {
    fontSize: 13,
    marginTop: 25,
    textAlign: 'center',
  },
});
