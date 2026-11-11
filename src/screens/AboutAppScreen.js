
import React from 'react';

import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useAppTheme } from '../context/ThemeContext';

const APP_VERSION = '1.0.0';
const CREATOR_NAME = 'Himantha Thewarapperuma';

export default function AboutAppScreen() {
  const { colors, isDark } = useAppTheme();

  const features = [
    {
      icon: 'cube-outline',
      title: 'Stock Management',
      description: 'Manage products and stock levels.',
    },
    {
      icon: 'cart-outline',
      title: 'Sales Management',
      description: 'Record and manage daily sales.',
    },
    {
      icon: 'wallet-outline',
      title: 'Expense Management',
      description: 'Track business expenses.',
    },
    {
      icon: 'bar-chart-outline',
      title: 'Business Reports',
      description: 'View business performance and profit.',
    },
    {
      icon: 'cloud-download-outline',
      title: 'Backup & Restore',
      description: 'Save and restore business records.',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Account Management',
      description: 'Manage and protect your account.',
    },
  ];

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* APP INFORMATION */}

      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.card },
        ]}
      >
        <View
          style={[
            styles.logoContainer,
            {
              backgroundColor: isDark
                ? '#1e3a8a'
                : '#dbeafe',
            },
          ]}
        >
          <Ionicons
            name="storefront"
            size={52}
            color={colors.primary}
          />
        </View>

        <Text
          style={[
            styles.appName,
            { color: colors.text },
          ]}
        >
          Shop Management App
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: colors.secondaryText },
          ]}
        >
          Manage Your Business Easily
        </Text>

        {/* APP VERSION */}

        <View
          style={[
            styles.versionBadge,
            {
              backgroundColor: isDark
                ? '#334155'
                : '#eff6ff',
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={15}
            color={colors.primary}
          />

          <Text
            style={[
              styles.versionText,
              { color: colors.primary },
            ]}
          >
            Version {APP_VERSION}
          </Text>
        </View>
      </View>

      {/* CREATOR INFORMATION */}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          About the Creator
        </Text>

        <View
          style={[
            styles.creatorIconContainer,
            {
              backgroundColor: isDark
                ? '#334155'
                : '#eff6ff',
            },
          ]}
        >
          <Ionicons
            name="person"
            size={42}
            color={colors.primary}
          />
        </View>

        <Text
          style={[
            styles.creatorName,
            { color: colors.text },
          ]}
        >
          {CREATOR_NAME}
        </Text>

        <Text
          style={[
            styles.creatorRole,
            { color: colors.primary },
          ]}
        >
          Designed & Developed by
        </Text>

        <View
          style={[
            styles.descriptionBox,
            {
              backgroundColor: colors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.description,
              { color: colors.secondaryText },
            ]}
          >
            This application was developed to help
            shop owners manage their daily business
            activities, including stock, sales,
            expenses and financial reports.
          </Text>
        </View>
      </View>

      {/* APPLICATION FEATURES */}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.sectionTitle,
            { color: colors.text },
          ]}
        >
          Application Features
        </Text>

        {features.map((feature, index) => (
          <View
            key={feature.title}
            style={[
              styles.featureRow,
              {
                borderBottomColor: colors.border,
                borderBottomWidth:
                  index === features.length - 1 ? 0 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.featureIcon,
                {
                  backgroundColor: isDark
                    ? '#334155'
                    : '#eff6ff',
                },
              ]}
            >
              <Ionicons
                name={feature.icon}
                size={23}
                color={colors.primary}
              />
            </View>

            <View style={styles.featureInfo}>
              <Text
                style={[
                  styles.featureTitle,
                  { color: colors.text },
                ]}
              >
                {feature.title}
              </Text>

              <Text
                style={[
                  styles.featureDescription,
                  { color: colors.secondaryText },
                ]}
              >
                {feature.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* FOOTER */}

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="heart"
          size={17}
          color="#ef4444"
        />

        <Text
          style={[
            styles.footerCreator,
            { color: colors.text },
          ]}
        >
          {CREATOR_NAME}
        </Text>

        <Text
          style={[
            styles.footerRole,
            { color: colors.secondaryText },
          ]}
        >
          Designed & Developed by
        </Text>

        <Text
          style={[
            styles.copyright,
            { color: colors.secondaryText },
          ]}
        >
          © 2026 All Rights Reserved.
        </Text>

        <Text
          style={[
            styles.footerVersion,
            { color: colors.secondaryText },
          ]}
        >
          Shop Management App | v{APP_VERSION}
        </Text>
      </View>
    </ScrollView>
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

  headerCard: {
    alignItems: 'center',
    padding: 25,
    borderRadius: 16,
    marginBottom: 16,
  },

  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  appName: {
    fontSize: 23,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },

  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },

  versionText: {
    fontSize: 13,
    fontWeight: '700',
  },

  card: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },

  creatorIconContainer: {
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },

  creatorName: {
    fontSize: 21,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  creatorRole: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 7,
    textAlign: 'center',
  },

  descriptionBox: {
    padding: 14,
    borderRadius: 10,
    marginTop: 18,
  },

  description: {
    fontSize: 14,
    lineHeight: 23,
    textAlign: 'center',
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 13,
  },

  featureIcon: {
    width: 43,
    height: 43,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureInfo: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
  },

  featureDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },

  footer: {
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 22,
    borderTopWidth: 1,
    gap: 8,
  },

  footerCreator: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  footerRole: {
    fontSize: 12,
  },

  copyright: {
    fontSize: 11,
    marginTop: 5,
  },

  footerVersion: {
    fontSize: 11,
    marginTop: 3,
  },
});
