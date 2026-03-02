import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, TextInput, Alert, Platform } from 'react-native';
import { theme } from '../theme/theme';
import { PrimaryButton } from './PrimaryButton';
import * as reminderService from '../services/reminderService';

interface ELI5SchemeCardProps {
    title: string;
    summary: string;
    eligibility: string;
    firstStep: string; // mapped to benefit_amount from backend
    onFeedback?: (isPositive: boolean) => void;
    docUrl?: string; // mapped to apply_url from backend
    schemeId?: string;
    logId?: string;
}

const PHONE_REGEX = /^\+91\d{10}$/; // Must be an Indian number (+91XXXXXXXXXX)

export const ELI5SchemeCard: React.FC<ELI5SchemeCardProps> = ({
    title,
    summary,
    eligibility,
    firstStep,
    onFeedback,
    docUrl,
    schemeId,
    logId,
}) => {
    // ── Feedback state ──
    const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(null);

    // ── Reminder state ──
    const [showPhoneInput, setShowPhoneInput] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isOptingIn, setIsOptingIn] = useState(false);
    const [reminderSet, setReminderSet] = useState(false);

    const handleFeedback = (isPositive: boolean) => {
        const score = isPositive ? 1 : -1;
        setFeedbackGiven(score as 1 | -1);
        onFeedback?.(isPositive);
    };

    const handleRemindPress = () => {
        if (!schemeId) return;
        setShowPhoneInput(true);
    };

    const handleOptIn = async () => {
        if (!schemeId) return;

        const trimmed = phoneNumber.trim();
        if (!PHONE_REGEX.test(trimmed)) {
            const msg = 'Please enter a valid phone number with country code (e.g., +919876543210)';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Invalid Number', msg);
            }
            return;
        }

        setIsOptingIn(true);
        try {
            await reminderService.optIn({
                scheme_id: schemeId,
                phone_number: trimmed,
            });
            setReminderSet(true);
            setShowPhoneInput(false);
        } catch {
            const msg = 'Could not set reminder. Please try again.';
            if (Platform.OS === 'web') {
                window.alert(msg);
            } else {
                Alert.alert('Error', msg);
            }
        } finally {
            setIsOptingIn(false);
        }
    };
    return (
        <View style={styles.outerContainer}>
            <View style={styles.container}>
                {/* Header with accent bar */}
                <View style={styles.header}>
                    <View style={styles.headerAccent} />
                    <View style={styles.headerContent}>
                        <Text style={styles.headerLabel}>SCHEME</Text>
                        <Text style={styles.title}>{title}</Text>
                    </View>
                </View>

                {/* ELI5 Content */}
                <View style={styles.content}>
                    <Text style={styles.summaryText}>{summary}</Text>

                    <View style={styles.infoCard}>
                        <View style={styles.row}>
                            <View style={styles.iconBadge}>
                                <Text style={styles.iconText}>✅</Text>
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Who gets it</Text>
                                <Text style={styles.detailText}>{eligibility}</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.row}>
                            <View style={styles.iconBadge}>
                                <Text style={styles.iconText}>📄</Text>
                            </View>
                            <View style={styles.rowContent}>
                                <Text style={styles.rowLabel}>Benefit Amount</Text>
                                <Text style={styles.detailText}>{firstStep}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actionBar}>
                    {reminderSet ? (
                        <View style={styles.reminderConfirm}>
                            <Text style={styles.reminderConfirmText}>✅ Reminder Set</Text>
                        </View>
                    ) : (
                        <PrimaryButton
                            label="Remind Me"
                            icon="⏰"
                            size="sm"
                            loading={isOptingIn}
                            onPress={handleRemindPress}
                            style={styles.remindButton}
                        />
                    )}

                    {docUrl && (
                        <TouchableOpacity
                            style={styles.secondaryAction}
                            onPress={() => Linking.openURL(docUrl)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.secondaryActionText}>🌐 View Docs</Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.feedbackContainer}>
                        <TouchableOpacity
                            onPress={() => handleFeedback(true)}
                            style={[
                                styles.feedbackButton,
                                feedbackGiven === 1 && styles.feedbackActive,
                            ]}
                            activeOpacity={0.7}
                            disabled={feedbackGiven !== null}
                        >
                            <Text style={styles.feedbackIcon}>👍</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleFeedback(false)}
                            style={[
                                styles.feedbackButton,
                                feedbackGiven === -1 && styles.feedbackActive,
                            ]}
                            activeOpacity={0.7}
                            disabled={feedbackGiven !== null}
                        >
                            <Text style={styles.feedbackIcon}>👎</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Phone input for reminder opt-in */}
                {showPhoneInput && !reminderSet && (
                    <View style={styles.phoneInputRow}>
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="+919876543210"
                            placeholderTextColor={theme.colors.textTertiary}
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            keyboardType="phone-pad"
                            maxLength={16}
                            autoFocus
                        />
                        <PrimaryButton
                            label="Set"
                            size="sm"
                            loading={isOptingIn}
                            onPress={handleOptIn}
                            style={styles.phoneSubmitBtn}
                        />
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        ℹ️ This is a simplified guide. Please verify on official portals.
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        marginVertical: theme.spacing.sm,
        maxWidth: '92%',
        alignSelf: 'flex-start',
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.xl,
        ...theme.shadows.md,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        overflow: 'hidden',
    },
    headerAccent: {
        width: 4,
        backgroundColor: theme.colors.primary,
    },
    headerContent: {
        flex: 1,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.primaryLighter,
    },
    headerLabel: {
        fontSize: theme.typography.sizes.xxs,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.primary,
        letterSpacing: theme.typography.letterSpacing.wider,
        marginBottom: 4,
    },
    title: {
        fontSize: theme.typography.sizes.lg,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.primaryDarker,
    },
    content: {
        padding: theme.spacing.md,
    },
    summaryText: {
        fontSize: theme.typography.sizes.md,
        lineHeight: theme.typography.lineHeights.lg,
        color: theme.colors.textPrimary,
        marginBottom: theme.spacing.md,
    },
    infoCard: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radii.lg,
        padding: theme.spacing.md,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconBadge: {
        width: theme.sizes.iconBadge,
        height: theme.sizes.iconBadge,
        borderRadius: theme.radii.md,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    iconText: {
        fontSize: 16,
    },
    rowContent: {
        flex: 1,
    },
    rowLabel: {
        fontSize: theme.typography.sizes.xs,
        fontWeight: theme.typography.weights.bold,
        color: theme.colors.textPrimary,
        marginBottom: 2,
    },
    detailText: {
        fontSize: theme.typography.sizes.sm,
        lineHeight: theme.typography.lineHeights.sm,
        color: theme.colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.borderLight,
        marginVertical: theme.spacing.sm,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
    remindButton: {
        marginRight: theme.spacing.sm,
    },
    secondaryAction: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 8,
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.background,
    },
    secondaryActionText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.medium,
    },
    feedbackContainer: {
        flexDirection: 'row',
        marginLeft: 'auto',
    },
    feedbackButton: {
        padding: 8,
    },
    feedbackActive: {
        backgroundColor: theme.colors.primaryLighter,
        borderRadius: theme.radii.md,
    },
    feedbackIcon: {
        fontSize: 18,
    },
    reminderConfirm: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    reminderConfirmText: {
        color: theme.colors.success,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.semibold,
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    phoneInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textPrimary,
        marginRight: theme.spacing.sm,
    },
    phoneSubmitBtn: {
        minWidth: 60,
    },
    disclaimer: {
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
    },
    disclaimerText: {
        fontSize: theme.typography.sizes.xxs,
        color: theme.colors.textTertiary,
        lineHeight: theme.typography.lineHeights.sm,
    },
});
