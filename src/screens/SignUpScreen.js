
import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { registerUser } from '../services/authService';

export default function SignUpScreen({ navigation }) {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopEmail, setShopEmail] = useState('');
  const [address, setAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (loading) return;

    const cleanShopName = shopName.trim();
    const cleanOwnerName = ownerName.trim();
    const cleanLoginEmail = loginEmail.trim().toLowerCase();
    const cleanShopEmail = shopEmail.trim().toLowerCase();

    if (!cleanShopName) {
      Alert.alert('Required Field', 'Please enter your shop name.');
      return;
    }

    if (!cleanOwnerName) {
      Alert.alert('Required Field', 'Please enter the owner name.');
      return;
    }

    if (!cleanLoginEmail) {
      Alert.alert('Required Field', 'Please enter your login email.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Error', 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      await registerUser(
        cleanOwnerName,
        cleanLoginEmail,
        password,
        confirmPassword,
        {
          shopName: cleanShopName,
          ownerName: cleanOwnerName,
          phone: phone.trim(),
          shopEmail: cleanShopEmail || cleanLoginEmail,
          address: address.trim(),
          registrationNumber: registrationNumber.trim(),
        }
      );

      Alert.alert(
        'Registration Successful',
        'Your account and shop information have been saved. Please log in.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.goBack(),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert(
        'Registration Error',
        error?.message || 'Unable to create account.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (
    label,
    value,
    onChangeText,
    placeholder,
    options = {}
  ) => (
    <View>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        editable={!loading}
        autoCapitalize={options.autoCapitalize || 'sentences'}
        keyboardType={options.keyboardType || 'default'}
        autoCorrect={false}
        textContentType={options.textContentType}
        multiline={options.multiline || false}
      />
    </View>
  );

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
          <Text style={styles.icon}>🏪</Text>

          <Text style={styles.title}>Create Account</Text>

          <Text style={styles.subtitle}>
            Register your account and shop information
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>
            Shop Information
          </Text>

          <Text style={styles.sectionDescription}>
            Enter the details of your shop.
          </Text>

          {renderInput(
            'Shop Name *',
            shopName,
            setShopName,
            'Enter shop name',
            { autoCapitalize: 'words' }
          )}

          {renderInput(
            'Owner Name *',
            ownerName,
            setOwnerName,
            'Enter owner name',
            { autoCapitalize: 'words' }
          )}

          {renderInput(
            'Phone Number',
            phone,
            setPhone,
            'Enter phone number',
            { keyboardType: 'phone-pad' }
          )}

          {renderInput(
            'Shop Email (Optional)',
            shopEmail,
            setShopEmail,
            'Enter shop email',
            {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            }
          )}

          {renderInput(
            'Shop Address',
            address,
            setAddress,
            'Enter shop address',
            { multiline: true }
          )}

          {renderInput(
            'Business Registration Number (Optional)',
            registrationNumber,
            setRegistrationNumber,
            'Enter registration number',
            { autoCapitalize: 'characters' }
          )}

          <View style={styles.sectionDivider} />

          <Text style={styles.sectionTitle}>
            Login Information
          </Text>

          <Text style={styles.sectionDescription}>
            Use these details to log in to your account.
          </Text>

          {renderInput(
            'Login Email *',
            loginEmail,
            setLoginEmail,
            'Enter login email',
            {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              textContentType: 'emailAddress',
            }
          )}

          <Text style={styles.label}>Password *</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Minimum 8 characters"
              placeholderTextColor="#94a3b8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              editable={!loading}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              <Text style={styles.showText}>
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>
            Confirm Password *
          </Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Re-enter your password"
              placeholderTextColor="#94a3b8"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              editable={!loading}
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              disabled={loading}
            >
              <Text style={styles.showText}>
                {showConfirmPassword ? 'Hide' : 'Show'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.signUpButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.signUpButtonText}>
                Create Account
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginHighlight}>
                Login
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Your account and shop information are stored
          locally on this device.
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
    padding: 20,
    paddingBottom: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 15,
  },

  icon: {
    fontSize: 48,
    marginBottom: 12,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
  },

  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: '#1e293b',
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 6,
  },

  sectionDescription: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },

  sectionDivider: {
    height: 1,
    backgroundColor: '#475569',
    marginVertical: 25,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 8,
    marginTop: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 50,
    paddingVertical: 12,
    fontSize: 15,
    color: '#f8fafc',
    backgroundColor: '#334155',
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 50,
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
    paddingLeft: 10,
    paddingVertical: 8,
  },

  signUpButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },

  disabledButton: {
    opacity: 0.6,
  },

  signUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  loginLink: {
    marginTop: 22,
    alignItems: 'center',
  },

  loginLinkText: {
    color: '#cbd5e1',
    fontSize: 14,
  },

  loginHighlight: {
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
