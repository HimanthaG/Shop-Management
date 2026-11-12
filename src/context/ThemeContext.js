
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@shop_management_theme';

const ThemeContext = createContext(null);

const lightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  secondaryText: '#64748b',
  border: '#e2e8f0',
  primary: '#2563eb',
  input: '#ffffff',
  tabBar: '#ffffff',
};

const darkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  card: '#1e293b',
  text: '#f8fafc',
  secondaryText: '#94a3b8',
  border: '#334155',
  primary: '#60a5fa',
  input: '#334155',
  tabBar: '#1e293b',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSavedTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(
          THEME_STORAGE_KEY
        );

        if (
          mounted &&
          (savedTheme === 'light' || savedTheme === 'dark')
        ) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.log('Theme loading error:', error);
      } finally {
        if (mounted) {
          setLoadingTheme(false);
        }
      }
    };

    loadSavedTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const changeTheme = async (newTheme) => {
    if (newTheme !== 'light' && newTheme !== 'dark') {
      return;
    }

    try {
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        newTheme
      );

      setTheme(newTheme);
    } catch (error) {
      console.log('Theme saving error:', error);
      throw error;
    }
  };

  const toggleTheme = async () => {
    await changeTheme(
      theme === 'light' ? 'dark' : 'light'
    );
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        changeTheme,
        toggleTheme,
        loadingTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useAppTheme must be used inside ThemeProvider.'
    );
  }

  return context;
}
