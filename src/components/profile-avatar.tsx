import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  uri?: string | null;
  size?: number;
};

export function ProfileAvatar({ uri, size = 48 }: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      accessibilityLabel="Profile picture"
      accessible
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <Ionicons
          name="person"
          size={size * 0.55}
          color="#737373"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});