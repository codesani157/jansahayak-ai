import React from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import {
    AppHeader,
    ChatInputBar,
    SystemBubble,
    UserBubble,
    QuickReplyList,
    ELI5SchemeCard,
    ResponsiveContainer,
    ScreenContainer,
} from '../components';
import { theme } from '../theme/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useChatMessages } from '../hooks';
import type { Message } from '../hooks';
import { DEFAULT_QUICK_REPLIES } from '../constants';
import { useAppContext } from '../context';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const DateSeparator = () => (
    <View style={styles.dateSeparator}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>Today</Text>
        <View style={styles.dateLine} />
    </View>
);

const TypingIndicator = () => (
    <View style={styles.typingContainer}>
        <SystemBubble text="● ● ●" />
    </View>
);

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
    const { persona } = useAppContext();
    const personaIcon = persona?.icon ?? '🚜';
    const {
        messages,
        isTyping,
        sendMessage,
        retryMessage,
        submitFeedback,
        listRef,
        scrollToEnd,
    } = useChatMessages();

    const renderMessage = ({ item }: { item: Message }) => {
        if (item.type === 'system') {
            return <SystemBubble text={item.text} />;
        }
        if (item.type === 'user') {
            return <UserBubble text={item.text} />;
        }
        if (item.type === 'scheme_card') {
            return (
                <ELI5SchemeCard
                    title={item.scheme.title}
                    summary={item.scheme.summary}
                    eligibility={item.scheme.eligibility}
                    firstStep={item.scheme.benefit_amount}
                    docUrl={item.scheme.apply_url}
                    schemeId={item.scheme.scheme_id}
                    logId={item.logId}
                    onFeedback={
                        item.logId
                            ? (isPositive) =>
                                  submitFeedback(item.logId!, isPositive ? 1 : -1)
                            : undefined
                    }
                />
            );
        }
        if (item.type === 'error') {
            return (
                <TouchableOpacity
                    style={styles.errorBubble}
                    onPress={() => retryMessage(item.id, item.retryText)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.errorText}>⚠️ {item.text}</Text>
                </TouchableOpacity>
            );
        }
        return null;
    };

    return (
        <ScreenContainer keyboardAvoiding>
            <AppHeader
                mode="full"
                personaIcon={personaIcon}
                onLanguagePress={() => navigation.navigate('Language')}
                onPersonaPress={() => navigation.navigate('Persona')}
            />

            <View style={styles.chatArea}>
                <ResponsiveContainer maxWidth={theme.layout.maxContentWidth}>
                    <FlatList<Message>
                        ref={listRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item.id}
                        ListHeaderComponent={<DateSeparator />}
                        ListFooterComponent={isTyping ? <TypingIndicator /> : null}
                        onContentSizeChange={scrollToEnd}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.chatCanvas}
                    />
                </ResponsiveContainer>
            </View>

            {/* Suggested Chips */}
            {messages.length < 3 && !isTyping && (
                <View style={styles.chipsOuter}>
                    <ResponsiveContainer maxWidth={theme.layout.maxContentWidth} fullHeight={false}>
                        <QuickReplyList
                            topics={DEFAULT_QUICK_REPLIES}
                            onSelect={sendMessage}
                        />
                    </ResponsiveContainer>
                </View>
            )}

            <View style={styles.inputOuter}>
                <ResponsiveContainer maxWidth={theme.layout.maxContentWidth} fullHeight={false}>
                    <ChatInputBar onSend={sendMessage} />
                </ResponsiveContainer>
            </View>
        </ScreenContainer>
    );
};

const styles = StyleSheet.create({
    chatArea: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
    },
    chatCanvas: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        flexGrow: 1,
    },
    dateSeparator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
    },
    dateLine: {
        flex: 1,
        height: 1,
        backgroundColor: theme.colors.border,
    },
    dateText: {
        fontSize: theme.typography.sizes.xxs,
        color: theme.colors.textTertiary,
        paddingHorizontal: theme.spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: theme.typography.letterSpacing.wider,
        fontWeight: theme.typography.weights.medium,
    },
    typingContainer: {
        opacity: 0.7,
    },
    errorBubble: {
        backgroundColor: theme.colors.errorLight,
        borderRadius: theme.radii.xl,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        marginVertical: theme.spacing.xs,
        maxWidth: '85%',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: theme.typography.sizes.sm,
        lineHeight: theme.typography.lineHeights.sm,
    },
    chipsOuter: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    inputOuter: {
        width: '100%',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderLight,
    },
});
