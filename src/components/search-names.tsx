import { StyleSheet, TextInput } from 'react-native';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
};

export function SearchNames({ value, onChangeText, onFocus }: Props) {
  return (
    <TextInput
      style={styles.input}
      placeholder="Search users..."
      placeholderTextColor="#888"
      value={value}
      onChangeText={onChangeText}
      onFocus={onFocus}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
    />
  );
}

const styles = StyleSheet.create({
    input: {
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      color: '#888',
    },
  });