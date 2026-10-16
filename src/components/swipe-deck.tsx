import { ReactNode, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Spacing } from '@/constants/theme';

type Direction = 'left' | 'right';

{ /*T extends { id: string } means that T is a placeholder for 
    whatever item you give it and the { id: string } means that 
    the item must have an id property that is a string.*/}
type SwipeDeckProps<T extends { id: string }> = {
  // data is an array of items of type T
  data: T[];
  // render card is a “render prop” a function the deck calls whenever it 
  // needs to draw an item.
  renderCard: (item: T) => ReactNode;
  onSwipeLeft?: (item: T) => void; // optional callback for when a card is swiped left
  onSwipeRight?: (item: T) => void; // optional callback for when a card is swiped right
  onEmpty?: () => void; // optional callback for when the deck is empty
  // the ? means that to call it you must do onEmpty?.() so that if it is 
  // undefined it will not throw an error.
};

export function SwipeDeck<T extends { id: string }>({
  data,
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  onEmpty,
}: SwipeDeckProps<T>) {
  // index is the index of the current card in the data array
  const [index, setIndex] = useState(0);

  const current = data[index]; // current is the current card in the data array
  const next = data[index + 1]; // next is the next card in the data array

  const handleSwiped = (direction: Direction) => {
    // SwipeableCard receives as a prop a function to call when the card is swiped. 
    // It calls this function with the direction of the swipe
    // flip through array and check for end of array and call onEmpty if so
    if (direction === 'left') onSwipeLeft?.(current);
    else onSwipeRight?.(current);

    const newIndex = index + 1;
    setIndex(newIndex);
    if (newIndex >= data.length) onEmpty?.();
  };

  if (!current) {
    // each render, checks if current is undefined (which happens
    // after the last card is swiped and onEmpty is called) and if so, 
    // renders a message saying there are no more cards.
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No more movies</Text>
      </View>
    );
  }

  return (
    <View style={styles.deck}>
      { /* Render the next card if it exists, which will be smaller and faded
           underneath the swipeable card */ }
      {next && <View style={styles.nextCard}>{renderCard(next)}</View>}

      {/* key forces a fresh card (with reset animation values) for each movie */}
      {/* The front card is wrapped in a SwipeableCard component that handles the 
      swipe gestures and animations */}
      <SwipeableCard key={current.id} onSwiped={handleSwiped}>
        {renderCard(current)}
      </SwipeableCard>
    </View>
  );
}

function SwipeableCard({
  children,
  onSwiped,
}: {
  children: ReactNode;
  onSwiped: (direction: Direction) => void;
}) {
  const { width } = useWindowDimensions();
  const threshold = width * 0.3;

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      const farEnough = Math.abs(e.translationX) > threshold;
      const fastFlick = Math.abs(e.velocityX) > 800 && Math.abs(e.translationX) > 40;

      if (farEnough || fastFlick) {
        const direction: Direction = e.translationX > 0 ? 'right' : 'left';
        translateX.value = withTiming(
          (direction === 'right' ? 1 : -1) * width * 1.5,
          { duration: 250 },
          (finished) => {
            if (finished) scheduleOnRN(onSwiped, direction);
          }
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-width, 0, width],
          [-15, 0, 15],
          Extrapolation.CLAMP
        )}deg`,
      },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  card: { ...StyleSheet.absoluteFill },
  nextCard: {
    ...StyleSheet.absoluteFill,
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, color: '#888' },
  badge: {
    position: 'absolute',
    top: Spacing.five,
    borderWidth: 3,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  likeBadge: { left: Spacing.four, transform: [{ rotate: '-12deg' }], borderColor: '#2f9e44' },
  nopeBadge: { right: Spacing.four, transform: [{ rotate: '12deg' }], borderColor: '#e03131' },
  badgeText: { fontSize: 24, fontWeight: '800' },
});