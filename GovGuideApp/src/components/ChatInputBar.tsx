import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { theme } from '../theme/theme';

interface ChatInputBarProps {
    onSend: (text: string) => void;
    onRecordVoiceStart?: () => void;
    onRecordVoiceEnd?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
    onSend,
    onRecordVoiceStart,
    onRecordVoiceEnd,
}) => {
    const [inputText, setInputText] = useState('');

    const handleSend = () => {
        if (inputText.trim()) {
            onSend(inputText.trim());
            setInputText('');
        }
    };

    const hasText = inputText.trim().length > 0;

    return (
        <View style={styles.container}>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    placeholder="Type your question..."
                    placeholderTextColor={theme.colors.textTertiary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                    maxLength={250}
                    onSubmitEditing={handleSend}
                />
            </View>

            {hasText ? (
                <TouchableOpacity
                    style={[styles.actionButton, styles.sendButton]}
                    onPress={handleSend}
                    accessibilityLabel="Send message"
                    activeOpacity={0.7}
                >
                    <Text style={styles.sendIcon}>➤</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.actionButton, styles.micButton]}
                    onPressIn={onRecordVoiceStart}
                    onPressOut={onRecordVoiceEnd}
                    accessibilityLabel="Hold to record voice"
                    activeOpacity={0.7}
                >
                    <Text style={styles.micIcon}>🎤</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderRadius: theme.radii.xxl,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: Platform.OS === 'ios' ? 12 : 10,
        marginRight: theme.spacing.sm,
        minHeight: theme.sizes.actionButton,
        maxHeight: 120,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    input: {
        fontSize: theme.typography.sizes.md,
        color: theme.colors.textPrimary,
        lineHeight: theme.typography.lineHeights.md,
    },
    actionButton: {
        width: theme.sizes.actionButton,
        height: theme.sizes.actionButton,
        borderRadius: theme.radii.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButton: {
        backgroundColor: theme.colors.primary,
        ...theme.shadows.glow,
    },
    micButton: {
        backgroundColor: theme.colors.primaryLight,
    },
    sendIcon: {
        color: theme.colors.textInverse,
        fontSize: 20,
        marginLeft: 3,
    },
    micIcon: {
        fontSize: 22,
    }
});
