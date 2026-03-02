import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '../theme/theme';

interface QuickReplyChipProps {
    label: string;
    onPress: () => void;
}

export const QuickReplyChip: React.FC<QuickReplyChipProps> = ({ label, onPress }) => (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
);

interface QuickReplyListProps {
    topics: string[];
    onSelect: (topic: string) => void;
}

export const QuickReplyList: React.FC<QuickReplyListProps> = ({ topics, onSelect }) => {
    return (
        <View>
            <Text style={styles.suggestLabel}>Suggested topics</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
                keyboardShouldPersistTaps="handled"
            >
                {topics.map((topic, index) => (
                    <QuickReplyChip key={index} label={topic} onPress={() => onSelect(topic)} />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    suggestLabel: {
        fontSize: theme.typography.sizes.xxs,
        color: theme.colors.textTertiary,
        textTransform: 'uppercase',
        letterSpacing: theme.typography.letterSpacing.wider,
        fontWeight: theme.typography.weights.medium,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.xs,
    },
    listContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    chip: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 10,
        borderRadius: theme.radii.full,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
        marginRight: theme.spacing.sm,
        ...theme.shadows.sm,
    },
    text: {
        color: theme.colors.primaryDark,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
    }
});
