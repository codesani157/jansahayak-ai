import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppHeader, SelectionGrid, ResponsiveContainer, ScreenContainer } from '../components';
import type { GridItem } from '../components';
import { theme } from '../theme/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { LANGUAGES } from '../constants';
import { useAppContext } from '../context';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Language'>;
};

export const LanguageScreen: React.FC<Props> = ({ navigation }) => {
    const { setLanguage } = useAppContext();

    const handleSelect = (item: GridItem) => {
        setLanguage(item.id);
        // Preferences are synced when the user completes persona selection
        // (both language + role sent together in one call).
        navigation.navigate('Persona');
    };

    return (
        <ScreenContainer>
            <AppHeader mode="minimal" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ResponsiveContainer maxWidth={theme.layout.maxContentWidth} fullHeight={false}>
                    {/* Hero Section */}
                    <View style={styles.heroSection}>
                        <Text style={styles.emoji}>🇮🇳</Text>
                        <Text style={styles.heroTitle}>Welcome!</Text>
                        <Text style={styles.heroSubtitle}>Choose your preferred language</Text>
                    </View>

                    {/* Greeting Bubble */}
                    <View style={styles.greetingCard}>
                        <Text style={styles.greetingText}>
                            Hello! Which language do you prefer?
                        </Text>
                        <Text style={styles.greetingTextHindi}>
                            नमस्ते! आपको कौन सी भाषा पसंद है?
                        </Text>
                    </View>

                    {/* Language Selection Grid */}
                    <View style={styles.gridWrapper}>
                        <SelectionGrid items={LANGUAGES} onSelect={handleSelect} />
                    </View>
                </ResponsiveContainer>
            </ScrollView>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        flexGrow: 1,
        justifyContent: 'center',
    },
    heroSection: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.lg,
    },
    emoji: {
        fontSize: 48,
        marginBottom: theme.spacing.sm,
    },
    heroTitle: {
        fontSize: theme.typography.sizes.xxxl,
        fontWeight: theme.typography.weights.heavy,
        color: theme.colors.primaryDarker,
        letterSpacing: theme.typography.letterSpacing.tight,
    },
    heroSubtitle: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    greetingCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.xl,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        alignItems: 'center',
        ...theme.shadows.card,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    greetingText: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textPrimary,
        lineHeight: theme.typography.lineHeights.lg,
        textAlign: 'center',
    },
    greetingTextHindi: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textSecondary,
        lineHeight: theme.typography.lineHeights.lg,
        textAlign: 'center',
        marginTop: theme.spacing.xs,
    },
    gridWrapper: {
        marginTop: theme.spacing.sm,
    }
});
