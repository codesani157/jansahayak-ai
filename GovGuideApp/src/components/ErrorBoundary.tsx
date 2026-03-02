import React, { Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Top-level error boundary that catches unhandled React errors
 * and shows a full-screen recovery UI instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // In production, send to a logging service (Sentry, etc.)
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    handleRestart = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={styles.emoji}>⚠️</Text>
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.subtitle}>
                        An unexpected error occurred. Please restart the app.
                    </Text>
                    {__DEV__ && this.state.error && (
                        <Text style={styles.errorDetail}>
                            {this.state.error.message}
                        </Text>
                    )}
                    <TouchableOpacity
                        style={styles.button}
                        onPress={this.handleRestart}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Restart</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        paddingHorizontal: theme.spacing.lg,
    },
    emoji: {
        fontSize: 64,
        marginBottom: theme.spacing.md,
    },
    title: {
        fontSize: theme.typography.sizes.xxl,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: theme.typography.lineHeights.lg,
        marginBottom: theme.spacing.lg,
        maxWidth: 300,
    },
    errorDetail: {
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.error,
        fontFamily: 'monospace',
        backgroundColor: theme.colors.errorLight,
        padding: theme.spacing.md,
        borderRadius: theme.radii.md,
        marginBottom: theme.spacing.lg,
        maxWidth: '90%',
        overflow: 'hidden',
    },
    button: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radii.full,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.xl,
        ...theme.shadows.glow,
    },
    buttonText: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.weights.bold,
    },
});
