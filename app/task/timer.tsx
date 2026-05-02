import {
  GetActiveSprint,
  RemoveActiveSprint,
  SaveActiveSprint,
} from '@/lib/asyncStorage';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
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

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getSessionId(sessionData: unknown) {
  if (!sessionData || typeof sessionData !== 'object') {
    return null;
  }

  const maybeSession = sessionData as {
    sessionId?: string;
    sessionid?: string;
  };

  return maybeSession.sessionId ?? maybeSession.sessionid ?? null;
}

export default function TimerScreen() {
  const [containerHeight, setContainerHeight] = React.useState(0);
  const [duration, setDuration] = React.useState(TIMER_OPTIONS[0]);
  const [timerIsRunning, setIsRunning] = React.useState(false);
  const [timerOverlayVisible, setTimerOverlayVisible] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [task, setTask] = React.useState<Task | null>(null);

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
  const cancelHoldCompletedRef = React.useRef(false);
  const cancelHoldActiveRef = React.useRef(false);
  const cancelHoldIdRef = React.useRef(0);
  const cancelHoldStartedAtRef = React.useRef(0);

  const { tId } = useLocalSearchParams<{ tId?: string}>();
  const timerOverlayHeight = Math.max(containerHeight, 1);
  const timerOverlayOffscreenY = timerOverlayHeight + 1000;

  React.useEffect(() => {
    if (containerHeight > 0 && !timerIsRunning) {
      timerAnimation.setValue(timerOverlayOffscreenY);
    }
  }, [containerHeight, timerIsRunning, timerAnimation, timerOverlayOffscreenY]);

  React.useEffect(() => {
    if (!tId) {
      setTask(null);
      return;
    }

    const fetchTask = async () => {
      const {data, error} = await supabase
      .from('tasks')
      .select('*')
      .eq('tId', tId)
      .single()
    

    if (!error && data) {
      setTask(data);
    }
  };
  fetchTask();
}, [tId])

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
  );

  const countdownTranslateX = focusModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width * 0.3],
  });

  const countdownTranslateY = focusModeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -height * 0.35],
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

  const finalizeSprintSession = React.useCallback(async (finalStatus: 'completed' | 'cancelled' | 'expired') => {
    const activeSprint = await GetActiveSprint();

    if (!activeSprint) {
      return;
    }

    await RemoveActiveSprint();

    const { error } = await supabase.rpc('finalize_sprint_session', {
      p_session_id: activeSprint.sessionId,
      p_final_status: finalStatus,
      p_ended_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert(
        'Could not finalize sprint session',
        error.message
      );
    }
  }, []);

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
    cancelHoldCompletedRef.current = false;

    timerAnimation.setValue(timerOverlayOffscreenY);
    cancelOverlayAnimation.setValue(0);
    setTimerOverlayVisible(false);
    setTimeRemaining(0);
    setIsRunning(false);
  }, [cancelOverlayAnimation, timerAnimation, timerOverlayOffscreenY]);

  const finishTimer = React.useCallback(() => {
    clearCountdownInterval();
    void finalizeSprintSession('completed');

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
    finalizeSprintSession,
    focusModeAnimation,
    resetSessionValues,
    taskDetailsAnimation,
  ]);

  // This picks up the timer overlay animation from the current Y position and
  // runs it to the bottom over the remaining session time.
  const startProgressAnimation = React.useCallback(
    (fromY: number) => {
      const elapsedRatio = fromY / timerOverlayHeight;
      const remainingMs = sessionDurationMsRef.current * (1 - elapsedRatio);

      sessionStartedAtRef.current = Date.now() - sessionDurationMsRef.current * elapsedRatio;
      timerAnimation.setValue(fromY);

      const progressAnimation = Animated.timing(timerAnimation, {
        toValue: timerOverlayHeight,
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
    [finishTimer, timerAnimation, timerOverlayHeight]
  );

  const runStartSequence = React.useCallback(() => {
    buttonAnimation.setValue(1);
    cancelButtonAnimation.setValue(1);
    countdownAnimation.setValue(1);
    timerAnimation.setValue(0);

    startProgressAnimation(0);

    const focusAnimation = Animated.parallel([
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

    runningAnimationRef.current = focusAnimation;
    focusAnimation.start(() => {
      runningAnimationRef.current = null;
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
    (endTime: number) => {
      clearCountdownInterval();

      const updateRemainingTime = () => {
        const remainingSeconds = Math.max(
          0,
          Math.ceil((endTime - Date.now()) / 1000)
        );

        setTimeRemaining(remainingSeconds);

        if (remainingSeconds <= 0) {
          clearCountdownInterval();
        }
      };

      updateRemainingTime();
      countdownRef.current = setInterval(updateRemainingTime, 1000);
    },
    [clearCountdownInterval]
  );

  React.useEffect(() => {
    if (!tId || timerIsRunning || containerHeight === 0) {
      return;
    }

    const restoreSprint = async () => {
      const activeSprint = await GetActiveSprint();

      if (!activeSprint || activeSprint.taskId !== tId) {
        return;
      }

      const remainingMs = activeSprint.endTime - Date.now();

      if (remainingMs <= 0) {
        await finalizeSprintSession('expired');
        return;
      }

      const totalMs = activeSprint.durationSeconds * 1000;
      const elapsedMs = totalMs - remainingMs;
      const elapsedRatio = Math.max(0, Math.min(elapsedMs / totalMs, 1));
      const restoredY = timerOverlayHeight * elapsedRatio;

      setIsRunning(true);
      setTimerOverlayVisible(true);
      sessionStartedAtRef.current = Date.now() - elapsedMs;
      sessionDurationMsRef.current = totalMs;

      buttonAnimation.setValue(1);
      cancelButtonAnimation.setValue(1);
      countdownAnimation.setValue(1);
      focusModeAnimation.setValue(1);
      taskDetailsAnimation.setValue(1);
      cancelOverlayAnimation.setValue(0);

      startCountdown(activeSprint.endTime);
      startProgressAnimation(restoredY);
    };

    void restoreSprint();
  }, [
    buttonAnimation,
    cancelButtonAnimation,
    cancelOverlayAnimation,
    containerHeight,
    countdownAnimation,
    finalizeSprintSession,
    focusModeAnimation,
    startCountdown,
    startProgressAnimation,
    taskDetailsAnimation,
    tId,
    timerOverlayHeight,
    timerIsRunning,
  ]);

  const startTimerSession = React.useCallback(async () => {
    if (!tId || timerIsRunning || containerHeight === 0) {
      return;
    }

    const totalSeconds = duration * TIMER_UNIT_IN_SECONDS;
    const endTime = Date.now() + totalSeconds * 1000;
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user?.id) {
      Alert.alert('Could not start sprint', 'Missing signed-in user for sprint session.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.rpc('start_sprint_session', {
      p_task_id: tId,
      p_user_id: userData.user.id,
      p_planned_duration: totalSeconds,
      p_started_at: new Date().toISOString(),
    });

    const sessionId = getSessionId(sessionData);

    if (sessionError || !sessionId) {
      Alert.alert(
        'Could not start sprint',
        sessionError?.message ?? 'Sprint session could not be created.'
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(true);
    setTimerOverlayVisible(true);

    taskDetailsAnimation.setValue(0);
    countdownAnimation.setValue(0);
    cancelOverlayAnimation.setValue(0);

    sessionStartedAtRef.current = Date.now();
    sessionDurationMsRef.current = totalSeconds * 1000;

    void SaveActiveSprint({
      sessionId,
      taskId: tId,
      durationSeconds: totalSeconds,
      endTime,
    });

    startCountdown(endTime);
    runStartSequence();
  }, [
    cancelOverlayAnimation,
    containerHeight,
    countdownAnimation,
    duration,
    runStartSequence,
    startCountdown,
    taskDetailsAnimation,
    tId,
    timerIsRunning,
  ]);

  const cancelTimer = React.useCallback(() => {
    if (!timerIsRunning) {
      return;
    }

    clearCountdownInterval();
    clearCancelHoldTimeouts();
    void finalizeSprintSession('cancelled');

    runningAnimationRef.current?.stop();
    runningAnimationRef.current = null;

    progressAnimationRef.current?.stop();
    progressAnimationRef.current = null;

    timerAnimation.stopAnimation(() => {
      cancelOverlayAnimation.stopAnimation(() => {
        timerAnimation.setValue(timerOverlayOffscreenY);
        cancelOverlayAnimation.setValue(0);
        setTimerOverlayVisible(false);

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
        ]).start(() => {
          Animated.timing(buttonAnimation, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            resetSessionValues();
          });
        });
      });
    });
  }, [
    buttonAnimation,
    cancelButtonAnimation,
    cancelOverlayAnimation,
    clearCancelHoldTimeouts,
    clearCountdownInterval,
    countdownAnimation,
    finalizeSprintSession,
    focusModeAnimation,
    resetSessionValues,
    taskDetailsAnimation,
    timerAnimation,
    timerOverlayOffscreenY,
    timerIsRunning,
  ]);

  const handleCancelHoldStart = React.useCallback(() => {
    animateButtonPress(true);
    cancelHoldIdRef.current += 1;

    const cancelHoldId = cancelHoldIdRef.current;
    cancelHoldActiveRef.current = true;
    cancelHoldStartedAtRef.current = Date.now();
    cancelAccelStartedRef.current = false;
    cancelHoldCompletedRef.current = false;

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
      const expectedYAtCancel = timerOverlayHeight * clampedProgress;
      const cancelOffset = Math.max(0, timerOverlayHeight - expectedYAtCancel);

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
      cancelHoldCompletedRef.current = true;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      cancelTimer();
      cancelHoldTimeoutRef.current = null;
    }, HOLD_TO_CANCEL_MS);
  }, [animateButtonPress, cancelOverlayAnimation, cancelTimer, timerOverlayHeight]);

  const handleCancelHoldEnd = React.useCallback(() => {
    animateButtonPress(false);
    cancelHoldActiveRef.current = false;
    cancelHoldIdRef.current += 1;

    clearCancelHoldTimeouts();

    if (cancelHoldCompletedRef.current) {
      return;
    }

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
      
      <Stack.Screen 
      options={{
        title: timerIsRunning ? '' : 'Sprint duration',
        headerTransparent: true,
        headerTintColor: colors.text,
        headerTitleAlign: 'center',
      }}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.timerOverlay,
          {
            height: timerOverlayHeight,
            opacity: timerOverlayVisible ? 1 : 0,
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
        <Text style={styles.taskName}>{task?.title ?? 'Sprint'}</Text>
        <Text style={styles.taskDescription}>{task?.description || 'Focus on this task until the timer ends.'}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    overflow: 'hidden',
  },
  timerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
    top: height / 2.5 ,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
