import { ThemedText } from '@/components/themed-text';
import { Pressable, StyleSheet, View } from 'react-native';

//creates new type that can only be one of these values
export type ListType = 'liked' | 'watchlist' | 'disliked';

//list of tabs for the screen
const TABS: { key: ListType; label: string }[] = [
    { key: 'liked', label: 'Liked' },
    { key: 'watchlist', label: 'Watchlist' },
    { key: 'disliked', label: 'Hate' },
];

//used for inputs parent needs to give
type Props = {
    selected: ListType;
    onSelect: (list: ListType) => void;
};

//creates buttons on top of list screen
export function ListOptions({ selected, onSelect }: Props) {
    return (
        <View style={styles.tabBar}>
            {TABS.map((tab) => (
                <Pressable
                    key={tab.key}
                    onPress={() => onSelect(tab.key)}
                    style={[styles.tab, selected === tab.key && styles.tabActive]}
                >
                    <ThemedText style={selected === tab.key && styles.tabTextActive}>
                        {tab.label}
                    </ThemedText>
                </Pressable>
            ))}
        </View>
    );
}

//css layout for tab bar
const styles = StyleSheet.create({
    tabBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingBottom: 8,
    },
    tab: { paddingVertical: 8, paddingHorizontal: 16, opacity: 0.5 },
    tabActive: { opacity: 1, borderBottomWidth: 2 },
    tabTextActive: { fontWeight: '700' },
});