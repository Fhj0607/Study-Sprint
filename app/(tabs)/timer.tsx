import * as Haptics from 'expo-haptics';
import * as React from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

const colors = {
  black: '#323F4E',
  red: '#F76A6A',
  text: '#ffffff',
};


/*
  TODO
  Make timer count down even when app is un-focused or closed.
  Set const endTime = Date.now() + duration and save that to the task, maybe? 
  Then trigger notif when endTime == Date.now()? 
  Then fetch endTime from DB -> if null then timer is inactive
  if !null then set timer to endTime  - Date.now() and start
  Might have to save duration as well in DB to preserve timer animation persistance
*/


const TIMER_OPTIONS = [...Array(13).keys()].map((index) => (index === 0 ? 1 : index * 5));
const ITEM_SIZE = width * 0.38;
const ITEM_SPACING = (width - ITEM_SIZE) / 2;
const TIMER_UNIT_IN_SECONDS = 60;
const HOLD_TO_CANCEL_MS = 2000;
const CANCEL_ANIMATION_DELAY_MS = 250;
const BUTTON_PRESS_IN_MS = 80;
const BUTTON_PRESS_OUT_MS = 140;

const placeholderTask = {
  name: 'Read chapter 4',
  description: 'Focus on the summary questions and write down anything unclear.',
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default function TimerScreen() {
  const [containerHeight, setContainerHeight] = React.useState(0);
  const [duration, setDuration] = React.useState(TIMER_OPTIONS[0]);
  const [timerIsRunning, setIsRunning] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState(0);

  const scrollX = React.useRef(new Animated.Value(0)).current;
  const timerAnimation = React.useRef(new Animated.Value(0)).current;
  const buttonAnimation = React.useRef(new Animated.Value(0)).current;
  const taskDetailsAnimation = React.useRef(new Animated.Value(0)).current;
  const countdownAnimation = React.useRef(new Animated.Value(0)).current;
  const cancelButtonAnimation = React.useRef(new Animated.Value(0)).current;
  const pressedButtonAnimation = React.useRef(new Animated.Value(0)).current;
  const focusModeAnimation = React.useRef(new Animated.Value(0)).current;
  const cancelOverlayAnimation = React.useRef(new Animated.Value(0)).current;

  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelHoldTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHoldAnimationDelayRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const runningAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const progressAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const sessionStartedAtRef = React.useRef<number | null>(null);
  const sessionDurationMsRef = React.useRef(0);
  const cancelAccelStartedRef = React.useRef(false);
  const cancelHoldActiveRef = React.useRef(false);
  const cancelHoldIdRef = React.useRef(0);
  const cancelHoldStartedAtRef = React.useRef(0);

  React.useEffect(() => {
    if (containerHeight > 0 && !timerIsRunning) {
      timerAnimation.setValue(containerHeight);
    }
  }, [containerHeight, timerIsRunning, timerAnimation]);

  const pressedButtonScale = pressedButtonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.9],
  });

  const cancelButtonTranslateY = cancelButtonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });

  // Real timer progress comes from timerAnimation. The cancel hold adds a
  // temporary visual offset on top so release/cancel logic does not fight the
  // underlying progress animation.
  const timerOverlayTranslateY = Animated.add(
    timerAnimation,
    cancelOverlayAnimation
  ).interpolate({
    inputRange: [0, Math.max(containerHeight, 1)],
    outputRange: [0, Math.max(containerHeight, 1)],
    extrapolate: 'clamp',
  });

  const countdownTranslateX = focusModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width * 0.3],
  });

  const countdownTranslateY = focusModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -containerHeight * 0.35],
  });

  const countdownScale = focusModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.55],
  });

  const startButtonOpacity = buttonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const startButtonTranslateY = buttonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const pickerOpacity = buttonAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const taskDetailsOpacity = taskDetailsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const taskDetailsTranslateY = taskDetailsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const clearCountdownInterval = React.useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const clearCancelHoldTimeouts = React.useCallback(() => {
    if (cancelHoldTimeoutRef.current) {
      clearTimeout(cancelHoldTimeoutRef.current);
      cancelHoldTimeoutRef.current = null;
    }

    if (cancelHoldAnimationDelayRef.current) {
      clearTimeout(cancelHoldAnimationDelayRef.current);
      cancelHoldAnimationDelayRef.current = null;
    }
  }, []);

  const stopRunningAnimations = React.useCallback(() => {
    runningAnimationRef.current?.stop();
    runningAnimationRef.current = null;

    progressAnimationRef.current?.stop();
    progressAnimationRef.current = null;

    cancelOverlayAnimation.stopAnimation();
  }, [cancelOverlayAnimation]);

  React.useEffect(() => {
    return () => {
      clearCountdownInterval();
      clearCancelHoldTimeouts();
      stopRunningAnimations();
    };
  }, [clearCancelHoldTimeouts, clearCountdownInterval, stopRunningAnimations]);

  const animateButtonPress = React.useCallback(
    (pressed: boolean) => {
      Animated.timing(pressedButtonAnimation, {
        toValue: pressed ? 1 : 0,
        duration: pressed ? BUTTON_PRESS_IN_MS : BUTTON_PRESS_OUT_MS,
        useNativeDriver: true,
      }).start();
    },
    [pressedButtonAnimation]
  );

  const resetSessionValues = React.useCallback(() => {
    sessionStartedAtRef.current = null;
    sessionDurationMsRef.current = 0;
    cancelHoldActiveRef.current = false;
    cancelAccelStartedRef.current = false;

    timerAnimation.setValue(containerHeight);
    cancelOverlayAnimation.setValue(0);
    setTimeRemaining(0);
    setIsRunning(false);
  }, [cancelOverlayAnimation, containerHeight, timerAnimation]);

  const finishTimer = React.useCallback(() => {
    clearCountdownInterval();

    Animated.parallel([
      Animated.timing(countdownAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(focusModeAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(taskDetailsAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(buttonAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cancelButtonAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsRunning(false);
        /* TODO
          Implement store and send of ellapsed time value in seconds to DB
          for total time spent statistic
        */

        resetSessionValues();
      });
    });
  }, [
    buttonAnimation,
    cancelButtonAnimation,
    clearCountdownInterval,
    countdownAnimation,
    focusModeAnimation,
    resetSessionValues,
    taskDetailsAnimation,
  ]);

  // This picks up the timer overlay animation from the current Y position and
  // runs it to the bottom over the remaining session time.
  const startProgressAnimation = React.useCallback(
    (fromY: number) => {
      const elapsedRatio = fromY / containerHeight;
      const remainingMs = sessionDurationMsRef.current * (1 - elapsedRatio);

      sessionStartedAtRef.current = Date.now() - sessionDurationMsRef.current * elapsedRatio;
      timerAnimation.setValue(fromY);

      const progressAnimation = Animated.timing(timerAnimation, {
        toValue: containerHeight,
        duration: remainingMs,
        useNativeDriver: true,
      });

      progressAnimationRef.current = progressAnimation;
      progressAnimation.start(({ finished }) => {
        progressAnimationRef.current = null;

        if (!finished) {
          return;
        }

        finishTimer();
      });
    },
    [containerHeight, finishTimer, timerAnimation]
  );

  const runStartSequence = React.useCallback(() => {
    const runningAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(cancelButtonAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(countdownAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(timerAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(focusModeAnimation, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(taskDetailsAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    runningAnimationRef.current = runningAnimation;
    runningAnimation.start(({ finished }) => {
      runningAnimationRef.current = null;

      if (!finished) {
        return;
      }

      startProgressAnimation(0);
    });
  }, [
    buttonAnimation,
    cancelButtonAnimation,
    countdownAnimation,
    focusModeAnimation,
    startProgressAnimation,
    taskDetailsAnimation,
    timerAnimation,
  ]);

  const startCountdown = React.useCallback(
    (totalSeconds: number) => {
      setTimeRemaining(totalSeconds);
      clearCountdownInterval();

      countdownRef.current = setInterval(() => {
        setTimeRemaining((currentTime) => {
          if (currentTime <= 1) {
            clearCountdownInterval();
            return 0;
          }

          return currentTime - 1;
        });
      }, 1000);
    },
    [clearCountdownInterval]
  );

  const startTimerSession = React.useCallback(() => {
    if (timerIsRunning || containerHeight === 0) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(true);

    taskDetailsAnimation.setValue(0);
    countdownAnimation.setValue(0);
    cancelOverlayAnimation.setValue(0);

    const totalSeconds = duration * TIMER_UNIT_IN_SECONDS;
    sessionStartedAtRef.current = Date.now();
    sessionDurationMsRef.current = totalSeconds * 1000;

    startCountdown(totalSeconds);
    runStartSequence();
  }, [
    cancelOverlayAnimation,
    containerHeight,
    countdownAnimation,
    duration,
    runStartSequence,
    startCountdown,
    taskDetailsAnimation,
    timerIsRunning,
  ]);

  const cancelTimer = React.useCallback(() => {
    if (!timerIsRunning) {
      return;
    }

    clearCountdownInterval();
    clearCancelHoldTimeouts();
    stopRunningAnimations();

    Animated.parallel([
      Animated.timing(cancelButtonAnimation, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(taskDetailsAnimation, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(focusModeAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(countdownAnimation, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(timerAnimation, {
        toValue: containerHeight,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cancelOverlayAnimation, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.timing(buttonAnimation, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        resetSessionValues();
      });
    });
  }, [
    buttonAnimation,
    cancelButtonAnimation,
    cancelOverlayAnimation,
    clearCancelHoldTimeouts,
    clearCountdownInterval,
    containerHeight,
    countdownAnimation,
    focusModeAnimation,
    resetSessionValues,
    stopRunningAnimations,
    taskDetailsAnimation,
    timerAnimation,
    timerIsRunning,
  ]);

  const handleCancelHoldStart = React.useCallback(() => {
    animateButtonPress(true);
    cancelHoldIdRef.current += 1;

    const cancelHoldId = cancelHoldIdRef.current;
    cancelHoldActiveRef.current = true;
    cancelHoldStartedAtRef.current = Date.now();
    cancelAccelStartedRef.current = false;

    cancelHoldAnimationDelayRef.current = setTimeout(() => {
      cancelHoldAnimationDelayRef.current = null;

      if (!cancelHoldActiveRef.current || cancelHoldIdRef.current !== cancelHoldId) {
        return;
      }

      // The hold starts with normal button feedback. After a short delay, we
      // begin the accelerated red overlay preview so quick taps do not cause a
      // jolt, while long holds still clearly show that cancel is about to fire.
      cancelAccelStartedRef.current = true;
      cancelOverlayAnimation.setValue(0);

      const elapsedHoldMs = Date.now() - cancelHoldStartedAtRef.current;
      const remainingHoldMs = Math.max(1, HOLD_TO_CANCEL_MS - elapsedHoldMs);
      const sessionStartedAt = sessionStartedAtRef.current ?? Date.now();
      const elapsedAtCancelMs = Date.now() + remainingHoldMs - sessionStartedAt;
      const expectedProgress = elapsedAtCancelMs / sessionDurationMsRef.current;
      const clampedProgress = Math.max(0, Math.min(expectedProgress, 1));
      const expectedYAtCancel = containerHeight * clampedProgress;
      const cancelOffset = Math.max(0, containerHeight - expectedYAtCancel);

      Animated.timing(cancelOverlayAnimation, {
        toValue: cancelOffset,
        duration: remainingHoldMs,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, CANCEL_ANIMATION_DELAY_MS);

    cancelHoldTimeoutRef.current = setTimeout(() => {
      cancelHoldActiveRef.current = false;
      cancelHoldIdRef.current += 1;
      cancelAccelStartedRef.current = false;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      cancelTimer();
      cancelHoldTimeoutRef.current = null;
    }, HOLD_TO_CANCEL_MS);
  }, [animateButtonPress, cancelOverlayAnimation, cancelTimer, containerHeight]);

  const handleCancelHoldEnd = React.useCallback(() => {
    animateButtonPress(false);
    cancelHoldActiveRef.current = false;
    cancelHoldIdRef.current += 1;

    clearCancelHoldTimeouts();

    if (!cancelAccelStartedRef.current) {
      return;
    }

    cancelAccelStartedRef.current = false;
    cancelOverlayAnimation.stopAnimation((currentOffset) => {
      cancelOverlayAnimation.setValue(currentOffset);
      Animated.timing(cancelOverlayAnimation, {
        toValue: 0,
        duration: 750,
        easing: Easing.in(Easing.bounce),
        useNativeDriver: true,
      }).start();
    });
  }, [animateButtonPress, cancelOverlayAnimation, clearCancelHoldTimeouts]);

  const handleTimerPickerMomentumEnd = React.useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (timerIsRunning) {
        return;
      }

      const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_SIZE);
      const clampedIndex = Math.max(0, Math.min(index, TIMER_OPTIONS.length - 1));
      setDuration(TIMER_OPTIONS[clampedIndex]);
    },
    [timerIsRunning]
  );

  const renderTimerItem = React.useCallback(
    ({ item, index }: { item: number; index: number }) => {
      const inputRange = [
        (index - 1) * ITEM_SIZE,
        index * ITEM_SIZE,
        (index + 1) * ITEM_SIZE,
      ];

      const baseOpacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.4, 1, 0.4],
      });

      const opacity = Animated.multiply(baseOpacity, pickerOpacity);
      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.7, 1, 0.7],
      });

      return (
        <View style={styles.timerOptionItem}>
          <Animated.Text
            style={[
              styles.text,
              {
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            {item}
          </Animated.Text>
        </View>
      );
    },
    [pickerOpacity, scrollX]
  );

  return (
    <View
      style={styles.container}
      onLayout={(event) => {
        setContainerHeight(event.nativeEvent.layout.height);
      }}
    >
      <StatusBar hidden />

      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.timerOverlay,
          {
            height: containerHeight,
            width,
            transform: [{ translateY: timerOverlayTranslateY }],
          },
        ]}
      />

      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.startButtonContainer,
          {
            opacity: startButtonOpacity,
            transform: [{ translateY: startButtonTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          disabled={timerIsRunning}
          onPress={startTimerSession}
          onPressIn={() => animateButtonPress(true)}
          onPressOut={() => animateButtonPress(false)}
        >
          <Animated.View
            style={[
              styles.roundButton,
              {
                transform: [{ scale: pressedButtonScale }],
              },
            ]}
          >
            <Text className="text-text-main text-xl">Start</Text>
            <Text className="text-text-main text-xl">Sprint</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        pointerEvents={timerIsRunning ? 'auto' : 'none'}
        style={[
          styles.cancelButtonContainer,
          {
            opacity: cancelButtonAnimation,
            transform: [{ translateY: cancelButtonTranslateY }],
          },
        ]}
      >
        <TouchableOpacity onPressIn={handleCancelHoldStart} onPressOut={handleCancelHoldEnd}>
          <Animated.View
            style={[
              styles.cancelButton,
              {
                transform: [{ scale: pressedButtonScale }],
              },
            ]}
          >
            <Text className="text-text-main text-xl">Hold to end sprint</Text>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.countdownOverlay,
          {
            opacity: countdownAnimation,
            transform: [
              { translateX: countdownTranslateX },
              { translateY: countdownTranslateY },
              { scale: countdownScale },
            ],
          },
        ]}
      >
        <Text style={styles.countdownText}>{formatTime(timeRemaining)}</Text>
      </Animated.View>

      <View
        style={[
          styles.timerPickerWrapper,
          {
            top: containerHeight / 3,
          },
        ]}
      >
        <Animated.FlatList
          data={TIMER_OPTIONS}
          scrollEnabled={!timerIsRunning}
          keyExtractor={(item) => item.toString()}
          horizontal
          bounces={false}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
            useNativeDriver: true,
          })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleTimerPickerMomentumEnd}
          snapToInterval={ITEM_SIZE}
          decelerationRate="fast"
          style={styles.timerPickerList}
          contentContainerStyle={styles.timerPickerContent}
          renderItem={renderTimerItem}
        />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.taskDetails,
          {
            opacity: taskDetailsOpacity,
            transform: [{ translateY: taskDetailsTranslateY }],
          },
        ]}
      >
        <Text style={styles.taskName}>{placeholderTask.name}</Text>
        <Text style={styles.taskDescription}>{placeholderTask.description}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  timerOverlay: {
    backgroundColor: colors.red,
  },
  startButtonContainer: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 100,
  },
  roundButton: {
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: '#beb9a7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPickerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flex: 1,
  },
  timerPickerList: {
    flexGrow: 0,
  },
  timerPickerContent: {
    paddingHorizontal: ITEM_SPACING,
  },
  timerOptionItem: {
    width: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: ITEM_SIZE * 0.8,
    fontFamily: 'Menlo',
    color: colors.text,
    fontWeight: '900',
  },
  taskDetails: {
    position: 'absolute',
    top: height * 0.34,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  taskName: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  taskDescription: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 32,
    marginTop: 20,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: ITEM_SIZE * 0.32,
    fontFamily: 'Menlo',
    color: colors.text,
    fontWeight: '900',
    textAlign: 'center',
  },
  cancelButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 44,
    alignItems: 'center',
    zIndex: 2,
  },
  cancelButton: {
    minWidth: 112,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(155, 155, 155, 0.35)',
    backgroundColor: '#beb9a7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  countdownOverlay: {
    position: 'absolute',
    top: height / 3,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
