import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface BubbleProps {
    text: string;
    timestamp?: string;
}

export const SystemBubble: React.FC<BubbleProps> = ({ text, timestamp }) => {
    return (
        <View style={[styles.bubbleContainer, styles.systemContainer]}>
            <View style={styles.avatarCol}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🏛</Text>
                </View>
            </View>
            <View style={styles.bubbleCol}>
                <View style={[styles.bubble, styles.systemBubble]}>
                    <Text style={styles.systemText}>{text}</Text>
                </View>
                {timestamp && <Text style={[styles.timeText, styles.timeLeft]}>{timestamp}</Text>}
            </View>
        </View>
    );
};

export const UserBubble: React.FC<BubbleProps> = ({ text, timestamp }) => {
    return (
        <View style={[styles.bubbleContainer, styles.userContainer]}>
            <View style={styles.bubbleCol}>
                <View style={[styles.bubble, styles.userBubble]}>
                    <Text style={styles.userText}>{text}</Text>
                </View>
                {timestamp && <Text style={[styles.timeText, styles.timeRight]}>{timestamp}</Text>}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bubbleContainer: {
        marginVertical: theme.spacing.xs,
        maxWidth: '85%',
        flexDirection: 'row',
    },
    systemContainer: {
        alignSelf: 'flex-start',
    },
    userContainer: {
        alignSelf: 'flex-end',
    },
    avatarCol: {
        marginRight: theme.spacing.sm,
        justifyContent: 'flex-end',
    },
    avatar: {
        width: theme.sizes.avatar,
        height: theme.sizes.avatar,
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
    },
    bubbleCol: {
        flex: 1,
    },
    bubble: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 12,
        borderRadius: theme.radii.xl,
    },
    systemBubble: {
        backgroundColor: theme.colors.surface,
        borderBottomLeftRadius: theme.radii.xs,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: theme.colors.borderLight,
    },
    userBubble: {
        backgroundColor: theme.colors.userBubble,
        borderBottomRightRadius: theme.radii.xs,
        ...theme.shadows.card,
    },
    systemText: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textPrimary,
        lineHeight: theme.typography.lineHeights.lg,
    },
    userText: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textInverse,
        lineHeight: theme.typography.lineHeights.lg,
    },
    timeText: {
        fontSize: theme.typography.sizes.xxs,
        color: theme.colors.textTertiary,
        marginTop: 4,
    },
    timeLeft: {
        alignSelf: 'flex-start',
        marginLeft: theme.spacing.sm,
    },
    timeRight: {
        alignSelf: 'flex-end',
        marginRight: theme.spacing.sm,
    }
});
