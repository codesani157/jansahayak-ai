import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { AppHeader, SelectionGrid, ResponsiveContainer, ScreenContainer, PrimaryButton } from '../components';
import type { GridItem } from '../components';
import { theme } from '../theme/theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { PERSONAS } from '../constants';
import { useAppContext } from '../context';

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Persona'>;
};

export const PersonaScreen: React.FC<Props> = ({ navigation }) => {
    const { setPersona, language, syncPreferences, isSyncingPrefs } = useAppContext();
    const [selectedPersona, setSelectedPersona] = useState<GridItem | null>(null);

    const handleStart = async () => {
        if (selectedPersona) {
            setPersona(selectedPersona);
            // Sync both language + persona to the backend so the
            // RAG pipeline can filter schemes by role.
            await syncPreferences(language ?? 'en', selectedPersona.id);
            navigation.navigate('Chat');
        }
    };

    return (
        <ScreenContainer>
            <AppHeader mode="minimal" title="Tell us about yourself" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ResponsiveContainer maxWidth={theme.layout.maxContentWidth} fullHeight={false}>
                    {/* Section Header */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Who are you?</Text>
                        <Text style={styles.sectionSubtitle}>
                            Select your role so we can show you the most relevant government schemes
                        </Text>
                    </View>

                    <SelectionGrid
                        items={PERSONAS}
                        onSelect={setSelectedPersona}
                        selectedId={selectedPersona?.id}
                    />
                </ResponsiveContainer>
            </ScrollView>

            {/* Sticky Bottom Action Area */}
            <View style={styles.bottomArea}>
                <ResponsiveContainer maxWidth={theme.layout.maxContentWidth} fullHeight={false}>
                    <PrimaryButton
                        label={selectedPersona ? `Continue as ${selectedPersona.label.split(' ')[0]}` : 'Select a role to continue'}
                        icon={selectedPersona && !isSyncingPrefs ? '→' : undefined}
                        disabled={!selectedPersona}
                        loading={isSyncingPrefs}
                        onPress={handleStart}
                    />
                </ResponsiveContainer>
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
        flexGrow: 1,
    },
    sectionHeader: {
        marginTop: theme.spacing.xl,
        marginBottom: theme.spacing.md,
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: theme.typography.sizes.xxl,
        fontWeight: theme.typography.weights.heavy,
        color: theme.colors.primaryDarker,
        letterSpacing: theme.typography.letterSpacing.tight,
    },
    sectionSubtitle: {
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.sm,
        textAlign: 'center',
        lineHeight: theme.typography.lineHeights.sm,
        maxWidth: 300,
    },
    bottomArea: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
        ...theme.shadows.md,
    },
});
