import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList } from './types';
import { LanguageScreen } from '../screens/LanguageScreen';
import { PersonaScreen } from '../screens/PersonaScreen';
import { ChatScreen } from '../screens/ChatScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Language"
                screenOptions={{
                    headerShown: false,
                    animation: 'fade', // provides a smoother app-like transition
                }}
            >
                <Stack.Screen name="Language" component={LanguageScreen} />
                <Stack.Screen name="Persona" component={PersonaScreen} />
                <Stack.Screen name="Chat" component={ChatScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};
