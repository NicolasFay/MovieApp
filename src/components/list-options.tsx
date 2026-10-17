import { ThemedText } from '@/components/themed-text';
import { useState } from 'react';
import { Pressable } from 'react-native';

type ListType = 'liked' | 'watchlist' | 'disliked';

// this creates the bar to select which list to display for individual users.
export function ListOptions(){
    const [selected, setSelected] = useState<ListType | null>(null);

    return (
        <>
             <Pressable onPress={() => setSelected('liked')}>
                <ThemedText>Liked</ThemedText>
            </Pressable>

            <Pressable onPress={() => setSelected('watchlist')}>
                <ThemedText>Watchlist</ThemedText>
            </Pressable>

            <Pressable onPress={() => setSelected('disliked')}>
                <ThemedText>Hate</ThemedText>
            </Pressable>

            {selected === 'liked' && <ThemedText>This will be the liked list</ThemedText>}
            {selected === 'watchlist' && <ThemedText>This will be the watchlist</ThemedText>}
            {selected === 'disliked' && <ThemedText>This will be the hate list</ThemedText>}
        </>
    );
}