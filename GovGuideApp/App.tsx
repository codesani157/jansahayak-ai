import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet, Platform, Text, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProvider, useAppContext } from './src/context';
import { theme } from './src/theme/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';

/**
 * Splash screen shown while the app initialises (restores JWT / creates session).
 */
const SplashGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isInitializing } = useAppContext();

  if (isInitializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashEmoji}>🇮🇳</Text>
        <Text style={styles.splashTitle}>GovGuide</Text>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.splashSpinner} />
      </View>
    );
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ErrorBoundary>
          <StatusBar style="light" />
          <View style={styles.root}>
            <View style={styles.appContainer}>
              <SplashGate>
                <AppNavigator />
              </SplashGate>
            </View>
          </View>
        </ErrorBoundary>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? theme.layout.maxScreenWidth : undefined,
    backgroundColor: theme.colors.background,
    ...(Platform.OS === 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    } : {}),
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  splashEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  splashTitle: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.weights.heavy,
    color: theme.colors.primaryDarker,
    letterSpacing: theme.typography.letterSpacing.tight,
  },
  splashSpinner: {
    marginTop: theme.spacing.lg,
  },
});
