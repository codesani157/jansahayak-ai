import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { theme } from '../theme/theme';

interface AppHeaderProps {
    mode?: 'minimal' | 'full';
    title?: string;
    onLanguagePress?: () => void;
    onPersonaPress?: () => void;
    personaIcon?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
    mode = 'full',
    title = 'JanSahayak AI',
    onLanguagePress,
    onPersonaPress,
    personaIcon = '🚜'
}) => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.outerContainer}>
                <View style={styles.container}>
                    {mode === 'full' && (
                        <TouchableOpacity style={styles.iconButton} onPress={onPersonaPress} accessibilityLabel="Change Persona">
                            <Text style={styles.personaText}>{personaIcon}</Text>
                        </TouchableOpacity>
                    )}

                    {mode === 'minimal' && <View style={styles.spacer} />}

                    <View style={styles.titleContainer}>
                        <View style={styles.titleRow}>
                            <Text style={styles.titleGov}>JanSahayak</Text>
                            <Text style={styles.titleGuide}> AI</Text>
                        </View>
                        {mode === 'full' && (
                            <View style={styles.statusContainer}>
                                <View style={styles.statusDot} />
                                <Text style={styles.statusText}>Online</Text>
                            </View>
                        )}
                        {mode === 'minimal' && (
                            <Text style={styles.subtitle}>Your Government Schemes Assistant</Text>
                        )}
                    </View>

                    <TouchableOpacity style={styles.languageButton} onPress={onLanguagePress} accessibilityLabel="Change Language">
                        <Text style={styles.languageText}>A/अ</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: theme.colors.primaryDarker,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    outerContainer: {
        width: '100%',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        maxWidth: theme.layout.maxScreenWidth,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconButton: {
        width: theme.sizes.iconButton,
        height: theme.sizes.iconButton,
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.whiteAlpha15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    personaText: {
        fontSize: theme.typography.sizes.xl,
    },
    spacer: {
        width: theme.sizes.iconButton,
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    titleGov: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.heavy,
        color: theme.colors.textInverse,
        letterSpacing: theme.typography.letterSpacing.tight,
    },
    titleGuide: {
        fontSize: theme.typography.sizes.xl,
        fontWeight: theme.typography.weights.medium,
        color: theme.colors.primaryLight,
        letterSpacing: theme.typography.letterSpacing.tight,
    },
    subtitle: {
        fontSize: theme.typography.sizes.xxs,
        color: theme.colors.whiteAlpha70,
        marginTop: theme.spacing.xxs,
        letterSpacing: theme.typography.letterSpacing.wide,
        textTransform: 'uppercase',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.xxs,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: theme.radii.xs,
        backgroundColor: theme.colors.statusOnline,
        marginRight: theme.spacing.xs,
    },
    statusText: {
        fontSize: theme.typography.sizes.xxs,
        color: theme.colors.whiteAlpha70,
    },
    languageButton: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.whiteAlpha15,
        borderRadius: theme.radii.full,
    },
    languageText: {
        color: theme.colors.textInverse,
        fontWeight: theme.typography.weights.bold,
        fontSize: theme.typography.sizes.sm,
    }
});
