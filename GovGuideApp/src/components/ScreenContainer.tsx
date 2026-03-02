import React from 'react';
import { View, KeyboardAvoidingView, StyleSheet, Platform, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

interface ScreenContainerProps {
    children: React.ReactNode;
    keyboardAvoiding?: boolean;
    style?: ViewStyle;
}

/**
 * Shared wrapper for all screens — provides the standard flex:1
 * background and optional KeyboardAvoidingView behaviour.
 */
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
    children,
    keyboardAvoiding = false,
    style,
}) => {
    if (keyboardAvoiding) {
        return (
            <KeyboardAvoidingView
                style={[styles.container, style]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {children}
            </KeyboardAvoidingView>
        );
    }

    return <View style={[styles.container, style]}>{children}</View>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
});
