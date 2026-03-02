import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme/theme';

export interface GridItem {
    id: string;
    label: string;
    icon: string;
}

interface SelectionGridProps {
    items: GridItem[];
    onSelect: (item: GridItem) => void;
    selectedId?: string;
}

export const SelectionGrid: React.FC<SelectionGridProps> = ({ items, onSelect, selectedId }) => {
    return (
        <View style={styles.gridContainer}>
            {items.map((item) => {
                const isSelected = selectedId === item.id;
                return (
                    <TouchableOpacity
                        key={item.id}
                        style={[
                            styles.card,
                            isSelected && styles.cardSelected,
                        ]}
                        onPress={() => onSelect(item)}
                        activeOpacity={0.7}
                    >
                        <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                            <Text style={styles.icon}>{item.icon}</Text>
                        </View>
                        <Text style={[styles.label, isSelected && styles.labelSelected]}>
                            {item.label}
                        </Text>
                        {isSelected && (
                            <View style={styles.checkBadge}>
                                <Text style={styles.checkIcon}>✓</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.sm,
    },
    card: {
        width: '47%',
        backgroundColor: theme.colors.surface,
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radii.xl,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        borderWidth: 2,
        borderColor: theme.colors.borderLight,
        ...theme.shadows.card,
        position: 'relative' as const,
    },
    cardSelected: {
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.primaryLighter,
        ...theme.shadows.md,
    },
    iconContainer: {
        width: theme.sizes.iconLg,
        height: theme.sizes.iconLg,
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    iconContainerSelected: {
        backgroundColor: theme.colors.primaryLight,
    },
    icon: {
        fontSize: 32,
    },
    label: {
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
        color: theme.colors.textPrimary,
        textAlign: 'center',
        lineHeight: theme.typography.lineHeights.sm,
    },
    labelSelected: {
        color: theme.colors.primaryDark,
        fontWeight: theme.typography.weights.bold,
    },
    checkBadge: {
        position: 'absolute',
        top: theme.spacing.sm,
        right: theme.spacing.sm,
        width: theme.sizes.checkBadge,
        height: theme.sizes.checkBadge,
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkIcon: {
        color: theme.colors.textInverse,
        fontSize: 14,
        fontWeight: theme.typography.weights.bold,
    }
});
