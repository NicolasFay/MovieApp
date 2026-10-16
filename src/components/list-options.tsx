import { ThemedText } from '@/components/themed-text';
import { useState } from 'react';
import { Pressable } from 'react-native';

export function ListOptions(){
    const [tapped, setTapped] = useState(false);
    return (
        <>
            <Pressable
            onPress={() => setTapped(true)}
            >
                <ThemedText>Tap me!</ThemedText>
            </Pressable>
            <ThemedText>Nick is a butt face</ThemedText>

            {tapped && <ThemedText>Nick is a Bigger Butt Face</ThemedText>}

        </>

    );
}