import {useEffect} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {createPageScope} from 'react-native-liftoff';

const scope = createPageScope('Animated');

let firstFrameFired = false;
function markFirstFrame() {
  if (!firstFrameFired) {
    firstFrameFired = true;
    scope.mark('firstFrame');
  }
}

export default function AnimatedScreen() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const progress = useSharedValue(0);

  const cardStyle = useAnimatedStyle(() => {
    runOnJS(markFirstFrame)();
    return {
      transform: [
        {translateX: translateX.value},
        {translateY: translateY.value},
      ],
    };
  });

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate(e => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    });

  useEffect(() => {
    scope.mark('mounted');
    progress.value = withRepeat(withTiming(1, {duration: 1500}), -1, true);
    scope.markTTI();
  }, [progress]);

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Drag the card</Text>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.cardText}>Drag me</Text>
        </Animated.View>
      </GestureDetector>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressBar, progressBarStyle]} />
      </View>
      <Text style={styles.progressLabel}>Looping progress bar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  hint: {fontSize: 14, color: '#666', marginBottom: 24},
  card: {
    width: 140,
    height: 90,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  cardText: {color: '#fff', fontWeight: '700', fontSize: 16},
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 48,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 4,
  },
  progressLabel: {fontSize: 12, color: '#999', marginTop: 8},
});
