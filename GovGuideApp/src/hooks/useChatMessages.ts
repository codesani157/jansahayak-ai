import { useState, useRef, useCallback } from 'react';
import { FlatList } from 'react-native';
import { WELCOME_MESSAGE } from '../constants/messages';
import * as chatService from '../services/chatService';
import type { SchemeResult } from '../services/chatService';

// ── Message union type ─────────────────────────────────────────
export type Message =
    | { id: string; type: 'system'; text: string; logId?: string }
    | { id: string; type: 'user'; text: string }
    | { id: string; type: 'scheme_card'; scheme: SchemeResult; logId?: string }
    | { id: string; type: 'error'; text: string; retryText: string };

let messageCounter = 0;
const nextId = (): string => {
    messageCounter += 1;
    return `${Date.now()}-${messageCounter}`;
};

/**
 * Encapsulates all chat message state, real API calls, and auto-scroll
 * so ChatScreen stays purely presentational.
 */
export const useChatMessages = () => {
    const listRef = useRef<FlatList<Message>>(null);

    const [messages, setMessages] = useState<Message[]>([
        { id: '1', type: 'system', text: WELCOME_MESSAGE },
    ]);
    const [isTyping, setIsTyping] = useState(false);

    const scrollToEnd = useCallback(() => {
        listRef.current?.scrollToEnd({ animated: true });
    }, []);

    /**
     * Send a text query to the backend.
     * 1. Immediately show the user bubble (optimistic).
     * 2. Call the real API.
     * 3. Append the AI reply + any scheme cards.
     * 4. On error, show a tappable retry bubble.
     */
    const sendMessage = useCallback(async (text: string) => {
        const userMsg: Message = { id: nextId(), type: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        try {
            const response = await chatService.sendQuery(text);
            setIsTyping(false);

            const newMessages: Message[] = [];

            // Add the ELI5 reply bubble
            if (response.reply) {
                newMessages.push({
                    id: nextId(),
                    type: 'system',
                    text: response.reply,
                    logId: response.log_id,
                });
            }

            // Add scheme cards for any returned schemes
            for (const scheme of response.source_schemes) {
                newMessages.push({
                    id: nextId(),
                    type: 'scheme_card',
                    scheme,
                    logId: response.log_id,
                });
            }

            setMessages(prev => [...prev, ...newMessages]);
        } catch {
            setIsTyping(false);
            setMessages(prev => [
                ...prev,
                {
                    id: nextId(),
                    type: 'error',
                    text: 'Something went wrong. Tap to retry.',
                    retryText: text,
                },
            ]);
        }
    }, []);

    /**
     * Retry a failed message by re-sending the original text.
     * Removes the error bubble and re-invokes sendMessage.
     */
    const retryMessage = useCallback(
        (errorMessageId: string, originalText: string) => {
            setMessages(prev => prev.filter(m => m.id !== errorMessageId));
            sendMessage(originalText);
        },
        [sendMessage],
    );

    /**
     * Submit feedback (thumbs up / down) for a specific response.
     * Fire-and-forget — errors are silently ignored.
     */
    const submitFeedback = useCallback((logId: string, score: 1 | -1) => {
        chatService.sendFeedback(logId, score).catch(() => {
            // Silent — feedback is non-critical
        });
    }, []);

    return {
        messages,
        isTyping,
        sendMessage,
        retryMessage,
        submitFeedback,
        listRef,
        scrollToEnd,
    };
};

