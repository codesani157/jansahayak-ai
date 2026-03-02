import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { theme } from '../theme/theme';

interface PrimaryButtonProps {
    label: string;
    onPress?: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
    size?: 'sm' | 'md';
    style?: ViewStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
    label,
    onPress,
    disabled = false,
    loading = false,
    icon,
    size = 'md',
    style,
}) => {
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            style={[
                styles.base,
                size === 'sm' ? styles.sm : styles.md,
                isDisabled && styles.disabled,
                style,
            ]}
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator
                    size="small"
                    color={theme.colors.textInverse}
                    style={styles.spinner}
                />
            ) : (
                <Text style={[styles.text, size === 'sm' && styles.textSm]}>
                    {icon ? `${icon} ${label}` : label}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        backgroundColor: theme.colors.primary,
        borderRadius: theme.radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    md: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        ...theme.shadows.glow,
    },
    sm: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
    },
    disabled: {
        backgroundColor: theme.colors.textTertiary,
        opacity: 0.6,
        shadowOpacity: 0,
    },
    spinner: {
        marginVertical: 2,
    },
    text: {
        color: theme.colors.textInverse,
        fontSize: theme.typography.sizes.md,
        fontWeight: theme.typography.weights.bold,
    },
    textSm: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
    },
});
