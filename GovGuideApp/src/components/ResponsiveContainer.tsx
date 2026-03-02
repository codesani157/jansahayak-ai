import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

interface ResponsiveContainerProps {
    children: React.ReactNode;
    maxWidth?: number;
    style?: ViewStyle;
    fullHeight?: boolean;
}

/**
 * Constrains content to a max width and centers it on large screens.
 * On mobile, it's full width. On desktop/web it's centered with a max width.
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
    children,
    maxWidth = theme.layout.maxScreenWidth,
    style,
    fullHeight = true,
}) => {
    return (
        <View style={[styles.outer, fullHeight && styles.fullHeight, style]}>
            <View style={[styles.inner, { maxWidth }, fullHeight && styles.fullHeight]}>
                {children}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outer: {
        width: '100%',
        alignItems: 'center',
    },
    inner: {
        width: '100%',
    },
    fullHeight: {
        flex: 1,
    },
});
