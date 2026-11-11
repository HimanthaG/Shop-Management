
import React, {
  useState,
  useCallback,
  useMemo,
} from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import {
  getAccountShopProfile,
  saveAccountShopProfile,
} from '../services/accountShopService';

import { getDatabase } from '../services/database';
import { useAppTheme } from '../context/ThemeContext';

const ORIGINAL_ACCOUNT_EMAIL = 'himantha0326@gmail.com';

const LOGO_DIRECTORY =
  FileSystem.documentDirectory + 'shop-logo/';

const LEGACY_LOGO_PATH =
  LOGO_DIRECTORY + 'shop-logo.jpg';

const validateUserId = (userId) => {
  const id = Number(userId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Invalid account ID.');
  }

  return id;
};

const getAccountLogoPath = (userId) =>
  LOGO_DIRECTORY +
  `shop-logo-${validateUserId(userId)}.jpg`;

const getSavedLogo = async (userId) => {
  const path = getAccountLogoPath(userId);
  const info = await FileSystem.getInfoAsync(path);

  return info.exists ? path : null;
};

// Preserve the existing legacy logo for its
// explicitly identified original account only.
const migrateOriginalLogo = async (userId) => {
  const id = validateUserId(userId);
  const db = await getDatabase();

  const account = await db.getFirstAsync(
    'SELECT email FROM auth_users WHERE id = ?',
    [id]
  );

  if (!account) {
    throw new Error('Account not found.');
  }

  if (
    String(account.email || '').trim().toLowerCase() !==
    ORIGINAL_ACCOUNT_EMAIL
  ) {
    return;
  }

  const destination = getAccountLogoPath(id);
  const existing = await FileSystem.getInfoAsync(destination);

  if (existing.exists) return;

  const legacy = await FileSystem.getInfoAsync(
    LEGACY_LOGO_PATH
  );

  if (!legacy.exists) return;

  await FileSystem.makeDirectoryAsync(
    LOGO_DIRECTORY,
    { intermediates: true }
  );

  await FileSystem.copyAsync({
    from: LEGACY_LOGO_PATH,
    to: destination,
  });
};

export default function ShopInformationScreen({ userId }) {
  const { isDark, colors } = useAppTheme();

  const theme = useMemo(
    () => ({
      background:
        colors?.background ||
        (isDark ? '#0f172a' : '#f1f5f9'),
      card: isDark ? '#1e293b' : '#ffffff',
      text: isDark ? '#f8fafc' : '#0f172a',
      secondary: isDark ? '#94a3b8' : '#64748b',
      border: isDark ? '#334155' : '#e2e8f0',
      inputBackground: isDark ? '#0f172a' : '#ffffff',
      primary: colors?.primary || '#0f766e',
      logoBackground: isDark ? '#134e4a' : '#ccfbf1',
      logoText: isDark ? '#99f6e4' : '#0f766e',
      logoButtonBackground: isDark
        ? '#164e63'
        : '#e0f2fe',
      logoButtonText: isDark ? '#bae6fd' : '#0369a1',
      danger: isDark ? '#fca5a5' : '#dc2626',
    }),
    [isDark, colors]
  );

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] =
    useState('');

  const [profileExists, setProfileExists] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [logoUri, setLogoUri] = useState(null);
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);

  // ========================================
  // LOAD SHOP INFORMATION
  // ========================================

  const loadShopProfile = useCallback(async () => {
    try {
      setLoading(true);

      const id = validateUserId(userId);

      await migrateOriginalLogo(id);

      const profile = await getAccountShopProfile(id);

      if (profile) {
        setShopName(profile.shop_name || '');
        setOwnerName(profile.owner_name || '');
        setPhone(profile.phone || '');
        setEmail(profile.email || '');
        setAddress(profile.address || '');
        setRegistrationNumber(
          profile.registration_number || ''
        );

        setProfileExists(true);
        setEditing(false);
      } else {
        setShopName('');
        setOwnerName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setRegistrationNumber('');

        setProfileExists(false);
        setEditing(true);
      }

      setLogoUri(await getSavedLogo(id));
      setSelectedLogo(null);
      setRemoveLogo(false);
      setLogoVersion(Date.now());
    } catch (error) {
      Alert.alert(
        'Loading Error',
        error?.message || 'Unable to load shop information.'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadShopProfile();
    }, [loadShopProfile])
  );

  // ========================================
  // CHOOSE LOGO
  // ========================================

  const chooseLogo = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library.'
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setSelectedLogo(result.assets[0].uri);
      setRemoveLogo(false);
      setLogoVersion(Date.now());
    } catch (error) {
      Alert.alert(
        'Logo Selection Error',
        error?.message || 'Unable to select shop logo.'
      );
    }
  };

  const handleRemoveLogo = () => {
    setSelectedLogo(null);
    setRemoveLogo(true);
  };

  // ========================================
  // SAVE LOGO
  // ========================================

  const saveLogo = async () => {
    const id = validateUserId(userId);
    const destination = getAccountLogoPath(id);

    if (!selectedLogo && !removeLogo) {
      return getSavedLogo(id);
    }

    await FileSystem.makeDirectoryAsync(
      LOGO_DIRECTORY,
      { intermediates: true }
    );

    if (removeLogo) {
      await FileSystem.deleteAsync(destination, {
        idempotent: true,
      });

      return null;
    }

    const sourceInfo =
      await FileSystem.getInfoAsync(selectedLogo);

    if (!sourceInfo.exists) {
      throw new Error(
        'Selected image is unavailable. Please choose it again.'
      );
    }

    const temporaryPath =
      LOGO_DIRECTORY +
      `shop-logo-pending-${id}-${Date.now()}.jpg`;

    const previousPath =
      LOGO_DIRECTORY +
      `shop-logo-previous-${id}-${Date.now()}.jpg`;

    let previousMoved = false;

    try {
      await FileSystem.copyAsync({
        from: selectedLogo,
        to: temporaryPath,
      });

      const copied =
        await FileSystem.getInfoAsync(temporaryPath);

      if (!copied.exists) {
        throw new Error('Unable to copy selected logo.');
      }

      const existing =
        await FileSystem.getInfoAsync(destination);

      if (existing.exists) {
        await FileSystem.moveAsync({
          from: destination,
          to: previousPath,
        });

        previousMoved = true;
      }

      await FileSystem.moveAsync({
        from: temporaryPath,
        to: destination,
      });

      if (previousMoved) {
        await FileSystem.deleteAsync(previousPath, {
          idempotent: true,
        }).catch(() => {});
      }

      return destination;
    } catch (error) {
      if (previousMoved) {
        const current =
          await FileSystem.getInfoAsync(destination);

        if (!current.exists) {
          await FileSystem.moveAsync({
            from: previousPath,
            to: destination,
          }).catch(() => {});
        }
      }

      throw error;
    } finally {
      await FileSystem.deleteAsync(temporaryPath, {
        idempotent: true,
      }).catch(() => {});
    }
  };

  // ========================================
  // SAVE PROFILE
  // ========================================

  const handleSave = async () => {
    if (saving) return;

    if (!shopName.trim()) {
      Alert.alert('Required Field', 'Please enter shop name.');
      return;
    }

    if (!ownerName.trim()) {
      Alert.alert('Required Field', 'Please enter owner name.');
      return;
    }

    if (
      email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      Alert.alert(
        'Invalid Email',
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      setSaving(true);

      await saveAccountShopProfile(
        validateUserId(userId),
        shopName,
        ownerName,
        phone,
        email,
        address,
        registrationNumber
      );

      const savedLogo = await saveLogo();

      setLogoUri(savedLogo);
      setSelectedLogo(null);
      setRemoveLogo(false);
      setLogoVersion(Date.now());

      setProfileExists(true);
      setEditing(false);

      Alert.alert(
        'Success',
        'Shop information saved successfully.'
      );
    } catch (error) {
      Alert.alert(
        'Save Error',
        (error?.message || 'Unable to save shop information.') +
          '\n\nYour text details may already have been saved.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadShopProfile();
  };

  const displayedLogo = removeLogo
    ? null
    : selectedLogo || logoUri;

  // ========================================
  // REUSABLE COMPONENTS
  // ========================================

  const renderShopLogo = (size = 110) => (
    <View
      style={[
        styles.logoContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.logoBackground,
        },
      ]}
    >
      {displayedLogo ? (
        <Image
          key={`${displayedLogo}-${logoVersion}`}
          source={{ uri: displayedLogo }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.logoLetter,
            {
              fontSize: size * 0.42,
              color: theme.logoText,
            },
          ]}
        >
          {shopName.trim()
            ? shopName.trim()[0].toUpperCase()
            : 'S'}
        </Text>
      )}
    </View>
  );

  const renderDetail = (label, value) => (
    <View
      key={label}
      style={[
        styles.detailGroup,
        { borderBottomColor: theme.border },
      ]}
    >
      <Text
        style={[
          styles.detailLabel,
          { color: theme.secondary },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.detailValue,
          { color: theme.text },
        ]}
      >
        {value || 'Not provided'}
      </Text>
    </View>
  );

  const renderInput = (
    label,
    value,
    onChangeText,
    placeholder,
    options = {}
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.text }]}>
        {label}
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
          options.multiline && styles.multilineInput,
        ]}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        editable={!saving}
        keyboardType={options.keyboardType || 'default'}
        autoCapitalize={
          options.autoCapitalize || 'sentences'
        }
        autoCorrect={options.autoCorrect ?? true}
        multiline={options.multiline || false}
        textAlignVertical={
          options.multiline ? 'top' : 'center'
        }
        maxLength={options.maxLength || 300}
      />
    </View>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
        <Text
          style={[
            styles.loadingText,
            { color: theme.secondary },
          ]}
        >
          Loading shop information...
        </Text>
      </View>
    );
  }

  // ========================================
  // VIEW SAVED PROFILE
  // ========================================

  if (profileExists && !editing) {
    return (
      <ScrollView
        style={[
          styles.container,
          { backgroundColor: theme.background },
        ]}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <View style={styles.profileHeader}>
            {renderShopLogo(115)}

            <Text
              style={[
                styles.shopName,
                { color: theme.text },
              ]}
            >
              {shopName}
            </Text>

            <Text
              style={[
                styles.subtitle,
                { color: theme.secondary },
              ]}
            >
              Shop Information
            </Text>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.border },
            ]}
          />

          {renderDetail('Owner Name', ownerName)}
          {renderDetail('Phone Number', phone)}
          {renderDetail('Email Address', email)}
          {renderDetail('Shop Address', address)}
          {renderDetail(
            'Business Registration Number',
            registrationNumber
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.primary },
            ]}
            onPress={() => setEditing(true)}
          >
            <Text style={styles.primaryButtonText}>
              Edit Shop Information
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ========================================
  // CREATE OR EDIT PROFILE
  // ========================================

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {profileExists
              ? 'Edit Shop Information'
              : 'Create Shop Profile'}
          </Text>

          <Text
            style={[
              styles.description,
              { color: theme.secondary },
            ]}
          >
            These shop details belong only to your account.
          </Text>

          <View style={styles.logoSection}>
            {renderShopLogo(110)}

            <TouchableOpacity
              style={[
                styles.logoButton,
                {
                  backgroundColor:
                    theme.logoButtonBackground,
                },
              ]}
              onPress={chooseLogo}
              disabled={saving}
            >
              <Text
                style={[
                  styles.logoButtonText,
                  { color: theme.logoButtonText },
                ]}
              >
                Choose Shop Logo
              </Text>
            </TouchableOpacity>

            {displayedLogo ? (
              <TouchableOpacity
                onPress={handleRemoveLogo}
                disabled={saving}
              >
                <Text
                  style={[
                    styles.removeLogoText,
                    { color: theme.danger },
                  ]}
                >
                  Remove Logo
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {renderInput(
            'Shop Name *',
            shopName,
            setShopName,
            'Enter shop name',
            { autoCapitalize: 'words', maxLength: 100 }
          )}

          {renderInput(
            'Owner Name *',
            ownerName,
            setOwnerName,
            'Enter owner name',
            { autoCapitalize: 'words', maxLength: 100 }
          )}

          {renderInput(
            'Phone Number',
            phone,
            setPhone,
            'Enter shop phone number',
            {
              keyboardType: 'phone-pad',
              maxLength: 20,
            }
          )}

          {renderInput(
            'Email Address',
            email,
            setEmail,
            'Enter shop email',
            {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
              autoCorrect: false,
              maxLength: 150,
            }
          )}

          {renderInput(
            'Shop Address',
            address,
            setAddress,
            'Enter shop address',
            {
              multiline: true,
              maxLength: 300,
            }
          )}

          {renderInput(
            'Business Registration Number',
            registrationNumber,
            setRegistrationNumber,
            'Optional registration number',
            {
              autoCapitalize: 'characters',
              maxLength: 100,
            }
          )}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              { backgroundColor: theme.primary },
              saving && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {profileExists
                  ? 'Save Changes'
                  : 'Create Shop Profile'}
              </Text>
            )}
          </TouchableOpacity>

          {profileExists ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: theme.secondary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 16, padding: 20 },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoLetter: { fontWeight: 'bold' },
  shopName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: { fontSize: 14, marginTop: 5 },
  divider: { height: 1, marginVertical: 15 },
  detailGroup: {
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  detailLabel: { fontSize: 12, marginBottom: 5 },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 23,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 25,
    gap: 12,
  },
  logoButton: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 9,
  },
  logoButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeLogoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fieldGroup: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 48,
  },
  multilineInput: {
    height: 100,
    paddingTop: 12,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: { opacity: 0.6 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
