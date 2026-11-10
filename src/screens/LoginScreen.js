
import React, { useState, useRef } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';

import { loginUser } from '../services/authService';

export default function LoginScreen({
  navigation,
  onLoginSuccess,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveLoginInfo, setSaveLoginInfo] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const busyRef = useRef(false);

  const handleLogin = async () => {
    if (busyRef.current) return;

    if (!email.trim() || !password) {
      Alert.alert(
        'Missing Information',
        'Please enter your email address and password.'
      );
      return;
    }

    busyRef.current = true;
    setLoading(true);

    try {
      const user = await loginUser(
        email,
        password,
        saveLoginInfo
      );

      if (typeof onLoginSuccess === 'function') {
        await onLoginSuccess(user);
      }
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.shopIcon}>🏪</Text>

          <Text style={styles.title}>
            Shop Management
          </Text>

          <Text style={styles.subtitle}>
            Login to manage your shop
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email Address</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(previous => !previous)
              }
              disabled={loading}
            >
              <Text style={styles.showText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() =>
              setSaveLoginInfo(previous => !previous)
            }
            disabled={loading}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: saveLoginInfo }}
          >
            <View
              style={[
                styles.checkbox,
                saveLoginInfo && styles.checkboxChecked,
              ]}
            >
              {saveLoginInfo ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : null}
            </View>

            <Text style={styles.checkboxLabel}>
              Save login info
            </Text>
          </TouchableOpacity>

          <Text style={styles.checkboxDescription}>
            Stay logged in when you reopen the app.
          </Text>

          <TouchableOpacity
            style={[
              styles.loginButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpLink}
            onPress={() => navigation.navigate('SignUp')}
            disabled={loading}
          >
            <Text style={styles.signUpText}>
              Don't have an account?{' '}
              <Text style={styles.signUpHighlight}>
                Sign Up
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Your shop records are stored locally
          on this device.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },

  shopIcon: {
    fontSize: 52,
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },

  formCard: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 16,
    padding: 22,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#f8fafc',
    backgroundColor: '#334155',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#334155',
  },

  passwordInput: {
    flex: 1,
    fontSize: 15,
    color: '#f8fafc',
  },

  showText: {
    color: '#60a5fa',
    fontWeight: '600',
    paddingLeft: 12,
    paddingVertical: 8,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#64748b',
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },

  checkmark: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  checkboxLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },

  checkboxDescription: {
    marginTop: 7,
    marginLeft: 32,
    fontSize: 12,
    color: '#94a3b8',
  },

  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 26,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  signUpLink: {
    marginTop: 24,
    alignItems: 'center',
  },

  signUpText: {
    color: '#cbd5e1',
    fontSize: 14,
  },

  signUpHighlight: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },

  footer: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    marginTop: 24,
    lineHeight: 19,
  },
});
