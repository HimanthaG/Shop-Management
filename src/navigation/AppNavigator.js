
import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Ionicons from '@expo/vector-icons/Ionicons';

import DashboardScreen from '../screens/DashboardScreen';
import StockScreen from '../screens/StockScreen';
import SalesScreen from '../screens/SalesScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import ReportsScreen from '../screens/ReportsScreen';

import ShopInformationScreen from '../screens/ShopInformationScreen';
import BackupRestoreScreen from '../screens/BackupRestoreScreen';
import AccountManagementScreen from '../screens/AccountManagementScreen';
import AboutAppScreen from '../screens/AboutAppScreen';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';

import {
  getCurrentUser,
  logoutUser,
} from '../services/authService';

import {
  setActiveUser,
  clearActiveUser,
} from '../services/accountSession';

import { useAppTheme } from '../context/ThemeContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ========================================
// BOTTOM TAB ICONS
// ========================================

const getTabIconName = (routeName, focused) => {
  switch (routeName) {
    case 'Dashboard':
      return focused ? 'grid' : 'grid-outline';

    case 'Stock':
      return focused ? 'cube' : 'cube-outline';

    case 'Sales':
      return focused ? 'cart' : 'cart-outline';

    case 'Expenses':
      return focused ? 'wallet' : 'wallet-outline';

    case 'Reports':
      return focused ? 'bar-chart' : 'bar-chart-outline';

    default:
      return 'ellipse-outline';
  }
};

// ========================================
// MAIN BOTTOM TABS
// ========================================

function MainTabs({
  navigation,
  onDatabaseRestored,
  onLogout,
}) {
  const [menuVisible, setMenuVisible] = useState(false);

  const { isDark, colors, changeTheme } = useAppTheme();

  const openMenu = () => setMenuVisible(true);

  const closeMenu = () => setMenuVisible(false);

  // ========================================
  // THEME CHANGE
  // ========================================

  const handleThemeChange = async (value) => {
    try {
      await changeTheme(value ? 'dark' : 'light');
    } catch (error) {
      Alert.alert(
        'Theme Error',
        'Unable to save theme preference.'
      );
    }
  };

  // ========================================
  // LOGOUT
  // ========================================

  const confirmLogout = () => {
    closeMenu();

    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout,
        },
      ]
    );
  };

  // ========================================
  // MENU NAVIGATION
  // ========================================

  const handleMenuOption = (option) => {
    closeMenu();

    if (option === 'Shop Information') {
      navigation.navigate('ShopInformation');
      return;
    }

    if (option === 'Backup & Restore') {
      navigation.navigate('BackupRestore');
      return;
    }

    if (option === 'Account Management') {
      navigation.navigate('AccountManagement');
      return;
    }

    if (option === 'About App') {
      navigation.navigate('AboutApp');
      return;
    }

    if (option === 'Logout') {
      confirmLogout();
      return;
    }
  };

  // ========================================
  // HAMBURGER MENU OPTIONS
  // ========================================

  const menuOptions = [
    {
      title: 'Shop Information',
      icon: 'storefront-outline',
    },
    {
      title: 'Backup & Restore',
      icon: 'cloud-download-outline',
    },
    {
      title: 'Account Management',
      icon: 'settings-outline',
    },
    {
      title: 'About App',
      icon: 'information-circle-outline',
    },
    {
      title: 'Logout',
      icon: 'log-out-outline',
    },
  ];

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: colors.background },
      ]}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: true,

          headerStyle: {
            backgroundColor: colors.surface,
          },

          headerTintColor: colors.text,

          headerTitleStyle: {
            fontWeight: '600',
          },

          headerLeft: () => (
            <TouchableOpacity
              onPress={openMenu}
              style={styles.menuButton}
              accessibilityRole="button"
              accessibilityLabel="Open navigation menu"
            >
              <Ionicons
                name="menu"
                size={29}
                color={colors.text}
              />
            </TouchableOpacity>
          ),

          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={getTabIconName(route.name, focused)}
              size={size}
              color={color}
            />
          ),

          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },

          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.secondaryText,

          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            paddingTop: 5,
          },
        })}
      >
        <Tab.Screen name="Dashboard">
          {(props) => (
            <DashboardScreen
              {...props}
              onDatabaseRestored={onDatabaseRestored}
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Stock"
          component={StockScreen}
        />

        <Tab.Screen
          name="Sales"
          component={SalesScreen}
        />

        <Tab.Screen
          name="Expenses"
          component={ExpensesScreen}
        />

        <Tab.Screen
          name="Reports"
          component={ReportsScreen}
        />
      </Tab.Navigator>

      {/* HAMBURGER MENU */}

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable
          style={styles.overlay}
          onPress={closeMenu}
        >
          <View style={styles.menuPosition}>
            <Pressable
              style={[
                styles.menuContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {}}
            >
              <Text
                style={[
                  styles.menuTitle,
                  { color: colors.secondaryText },
                ]}
              >
                More Options
              </Text>

              {/* THEME SETTINGS */}

              <View
                style={[
                  styles.themeRow,
                  { borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={22}
                  color={colors.primary}
                />

                <View style={styles.themeInfo}>
                  <Text
                    style={[
                      styles.themeText,
                      { color: colors.text },
                    ]}
                  >
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>

                  <Text
                    style={[
                      styles.themeDescription,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {isDark
                      ? 'Dark appearance enabled'
                      : 'Light appearance enabled'}
                  </Text>
                </View>

                <Switch
                  value={isDark}
                  onValueChange={handleThemeChange}
                  trackColor={{
                    false: '#94a3b8',
                    true: '#2563eb',
                  }}
                  thumbColor="#ffffff"
                  ios_backgroundColor="#94a3b8"
                  accessibilityLabel="Toggle dark mode"
                />
              </View>

              {/* MENU ITEMS */}

              {menuOptions.map((option) => (
                <TouchableOpacity
                  key={option.title}
                  style={[
                    styles.menuItem,
                    { borderTopColor: colors.border },
                  ]}
                  onPress={() =>
                    handleMenuOption(option.title)
                  }
                >
                  <Ionicons
                    name={option.icon}
                    size={21}
                    color={
                      option.title === 'Logout'
                        ? '#ef4444'
                        : colors.secondaryText
                    }
                  />

                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color:
                          option.title === 'Logout'
                            ? '#ef4444'
                            : colors.text,
                      },
                    ]}
                  >
                    {option.title}
                  </Text>

                  <View style={styles.menuItemSpacer} />

                  <Ionicons
                    name="chevron-forward"
                    size={17}
                    color={colors.secondaryText}
                  />
                </TouchableOpacity>
              ))}
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ========================================
// APP NAVIGATOR
// ========================================

export default function AppNavigator({
  onDatabaseRestored,
}) {
  const [currentUser, setCurrentUser] = useState(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [sessionVersion, setSessionVersion] =
    useState(0);

  const { colors, isDark } = useAppTheme();

  // ========================================
  // RESTORE SAVED LOGIN
  // ========================================

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        clearActiveUser();

        const savedUser = await getCurrentUser();

        if (!active) return;

        if (savedUser) {
          setActiveUser(savedUser.id);
          setCurrentUser(savedUser);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.log(
          'Saved login check failed:',
          error.message
        );

        if (active) {
          clearActiveUser();
          setCurrentUser(null);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // LOGIN
  // ========================================

  const handleLoginSuccess = (user) => {
    try {
      setActiveUser(user.id);
      setCurrentUser(user);

      setSessionVersion(
        (previous) => previous + 1
      );
    } catch (error) {
      clearActiveUser();

      Alert.alert(
        'Login Error',
        error.message ||
          'Unable to start account session.'
      );
    }
  };

  // ========================================
  // LOGOUT
  // ========================================

  const handleLogout = async () => {
    try {
      await logoutUser();

      clearActiveUser();
      setCurrentUser(null);

      setSessionVersion(
        (previous) => previous + 1
      );

      console.log('User logged out successfully.');
    } catch (error) {
      Alert.alert(
        'Logout Error',
        error.message || 'Unable to log out.'
      );
    }
  };

  // ========================================
  // ACCOUNT DELETED
  // ========================================

  const handleAccountDeleted = () => {
    clearActiveUser();
    setCurrentUser(null);

    setSessionVersion(
      (previous) => previous + 1
    );

    console.log('Account deleted successfully.');
  };

  // ========================================
  // DATABASE RESTORED
  // ========================================

  const handleDatabaseRestored = async () => {
    if (typeof onDatabaseRestored === 'function') {
      await onDatabaseRestored();
    }
  };

  // ========================================
  // LOADING SCREEN
  // ========================================

  if (checkingSession) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text
          style={[
            styles.loadingText,
            { color: colors.secondaryText },
          ]}
        >
          Checking login session...
        </Text>
      </View>
    );
  }

  // ========================================
  // NAVIGATION
  // ========================================

  return (
    <NavigationContainer
      key={sessionVersion}
      theme={{
        dark: isDark,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.text,
          border: colors.border,
          notification: colors.primary,
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },

          headerTintColor: colors.text,

          headerTitleStyle: {
            fontWeight: '600',
          },

          contentStyle: {
            backgroundColor: colors.background,
          },
        }}
      >
        {currentUser === null ? (
          <>
            {/* LOGIN */}

            <Stack.Screen
              name="Login"
              options={{
                headerShown: false,
              }}
            >
              {(props) => (
                <LoginScreen
                  {...props}
                  onLoginSuccess={handleLoginSuccess}
                />
              )}
            </Stack.Screen>

            {/* SIGN UP */}

            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{
                title: 'Sign Up',
                headerBackTitle: 'Login',
              }}
            />
          </>
        ) : (
          <>
            {/* MAIN APP */}

            <Stack.Screen
              name="Main"
              options={{
                headerShown: false,
              }}
            >
              {(props) => (
                <MainTabs
                  {...props}
                  onDatabaseRestored={handleDatabaseRestored}
                  onLogout={handleLogout}
                />
              )}
            </Stack.Screen>

            {/* SHOP INFORMATION */}

            <Stack.Screen
              name="ShopInformation"
              options={{
                title: 'Shop Information',
                headerBackTitle: 'Back',
              }}
            >
              {(props) => (
                <ShopInformationScreen
                  {...props}
                  userId={currentUser.id}
                />
              )}
            </Stack.Screen>

            {/* BACKUP AND RESTORE */}

            <Stack.Screen
              name="BackupRestore"
              options={{
                title: 'Backup & Restore',
                headerBackTitle: 'Back',
              }}
            >
              {(props) => (
                <BackupRestoreScreen
                  {...props}
                  onDatabaseRestored={handleDatabaseRestored}
                />
              )}
            </Stack.Screen>

            {/* ACCOUNT MANAGEMENT */}

            <Stack.Screen
              name="AccountManagement"
              options={{
                title: 'Account Management',
                headerBackTitle: 'Back',
              }}
            >
              {(props) => (
                <AccountManagementScreen
                  {...props}
                  accountUser={currentUser}
                  onAccountDeleted={handleAccountDeleted}
                />
              )}
            </Stack.Screen>

            {/* ABOUT APP */}

            <Stack.Screen
              name="AboutApp"
              component={AboutAppScreen}
              options={{
                title: 'About App',
                headerBackTitle: 'Back',
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },

  menuButton: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  menuPosition: {
    position: 'absolute',
    top: 55,
    left: 12,
  },

  menuContainer: {
    width: 265,
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  menuTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: 10,
  },

  themeInfo: {
    flex: 1,
  },

  themeText: {
    fontSize: 15,
    fontWeight: '600',
  },

  themeDescription: {
    fontSize: 11,
    marginTop: 3,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },

  menuItemText: {
    fontSize: 15,
    fontWeight: '500',
  },

  menuItemSpacer: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});
