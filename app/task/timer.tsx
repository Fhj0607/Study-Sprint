import {
  GetActiveSession,
  RemoveActiveSession,
  SaveActiveSession,
} from '@/lib/asyncStorage';
import {
  DEFAULT_FOCUS_DURATION_MINUTES,
  DEFAULT_SHORT_BREAK_DURATION_MINUTES,
} from '@/lib/sessionDefaults';
import { supabase } from '@/lib/supabase';
import type { SessionType, Task } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
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
type PostSessionPrompt = {
  completedSessionType: SessionType;
  returnTaskId: string | null;
};

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

function getSessionLabel(sessionType: SessionType) {
  switch (sessionType) {
    case 'short_break':
      return 'Short Break';
    case 'long_break':
      return 'Long Break';
    default:
      return 'Sprint';
  }
}

type StartSessionInput = {
  sessionType: SessionType;
  taskId: string | null;
  durationSeconds: number;
};

export default function TimerScreen() {
  const [containerHeight, setContainerHeight] = React.useState(0);
  const duration = DEFAULT_FOCUS_DURATION_MINUTES;
  const [timerIsRunning, setIsRunning] = React.useState(false);
  const [timerOverlayVisible, setTimerOverlayVisible] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState(0);
  const [task, setTask] = React.useState<Task | null>(null);
  const [currentSessionType, setCurrentSessionType] = React.useState<SessionType>('focus');
  const [postSessionPrompt, setPostSessionPrompt] = React.useState<PostSessionPrompt | null>(null);
  const [pickerDuration, setPickerDuration] = React.useState(DEFAULT_FOCUS_DURATION_MINUTES);

  const scrollX = React.useRef(new Animated.Value(0)).current;
  const pickerListRef = React.useRef<Animated.FlatList<number> | null>(null);
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

  const { tId, sessionType: sessionTypeParam, durationMinutes, durationSeconds, returnTaskId, chooseDuration } = useLocalSearchParams<{
    tId?: string;
    sessionType?: SessionType;
    durationMinutes?: string;
    durationSeconds?: string;
    returnTaskId?: string;
    chooseDuration?: string;
  }>();
  const timerOverlayHeight = Math.max(containerHeight, 1);
  const timerOverlayOffscreenY = timerOverlayHeight + 1000;
  const selectedSessionType: SessionType = sessionTypeParam ?? 'focus';
  const showDurationPicker =
    selectedSessionType === 'focus' &&
    chooseDuration === 'true' &&
    durationSeconds == null;
  const selectedDurationMinutes = React.useMemo(() => {
    if (!durationMinutes) {
      return null;
    }

    const parsedDuration = Number(durationMinutes);

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      return null;
    }

    return parsedDuration;
  }, [durationMinutes]);
  const selectedDurationSeconds = React.useMemo(() => {
    if (!durationSeconds) {
      return null;
    }

    const parsedDuration = Number(durationSeconds);

    if (!Number.isFinite(parsedDuration) || parsedDuration <= 0) {
      return null;
    }

    return parsedDuration;
  }, [durationSeconds]);
  const displayDurationMinutes = React.useMemo(() => {
    if (selectedDurationSeconds != null) {
      return null;
    }

    if (selectedDurationMinutes != null) {
      return selectedDurationMinutes;
    }

    if (selectedSessionType === 'focus') {
      return DEFAULT_FOCUS_DURATION_MINUTES;
    }

    return DEFAULT_SHORT_BREAK_DURATION_MINUTES;
  }, [selectedDurationMinutes, selectedDurationSeconds, selectedSessionType]);

  React.useEffect(() => {
    if (showDurationPicker) {
      setPickerDuration(displayDurationMinutes ?? duration);
    }
  }, [displayDurationMinutes, duration, showDurationPicker]);

  React.useEffect(() => {
    if (!showDurationPicker) {
      return;
    }

    const selectedIndex = Math.max(0, TIMER_OPTIONS.indexOf(pickerDuration));
    const nextOffset = selectedIndex * ITEM_SIZE;

    scrollX.setValue(nextOffset);

    requestAnimationFrame(() => {
      pickerListRef.current?.scrollToOffset({
        offset: nextOffset,
        animated: false,
      });
    });
  }, [pickerDuration, scrollX, showDurationPicker]);

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

  const taskDetailsOpacity = taskDetailsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const taskDetailsTranslateY = taskDetailsAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const finalizeSprintSession = React.useCallback(async (finalStatus: 'completed' | 'cancelled' | 'expired') => {
    const activeSession = await GetActiveSession();

    if (!activeSession) {
      return;
    }

    await RemoveActiveSession();

    const { error } = await supabase.rpc('finalize_sprint_session', {
      p_session_id: activeSession.sessionId,
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
    setCurrentSessionType(selectedSessionType);
    setIsRunning(false);
  }, [cancelOverlayAnimation, selectedSessionType, timerAnimation, timerOverlayOffscreenY]);

  const finishTimer = React.useCallback(() => {
    clearCountdownInterval();
    const completedSessionType = currentSessionType;
    const completedReturnTaskId =
      completedSessionType === 'focus' ? (tId ?? null) : (returnTaskId ?? null);

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
        resetSessionValues();
        setPostSessionPrompt({
          completedSessionType,
          returnTaskId: completedReturnTaskId,
        });
      });
    });
  }, [
    buttonAnimation,
    cancelButtonAnimation,
    clearCountdownInterval,
    countdownAnimation,
    currentSessionType,
    finalizeSprintSession,
    focusModeAnimation,
    resetSessionValues,
    taskDetailsAnimation,
    returnTaskId,
    tId,
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
    if (timerIsRunning || containerHeight === 0) {
      return;
    }

    const restoreSprint = async () => {
      const activeSession = await GetActiveSession();

      if (!activeSession) {
        return;
      }

      if (activeSession.sessionType === 'focus' && activeSession.taskId !== tId) {
        return;
      }

      if (activeSession.sessionType !== 'focus' && selectedSessionType !== activeSession.sessionType) {
        return;
      }

      const remainingMs = activeSession.endTime - Date.now();

      if (remainingMs <= 0) {
        await finalizeSprintSession('expired');
        return;
      }

      const totalMs = activeSession.durationSeconds * 1000;
      const elapsedMs = totalMs - remainingMs;
      const elapsedRatio = Math.max(0, Math.min(elapsedMs / totalMs, 1));
      const restoredY = timerOverlayHeight * elapsedRatio;

      setIsRunning(true);
      setTimerOverlayVisible(true);
      setCurrentSessionType(activeSession.sessionType);
      sessionStartedAtRef.current = Date.now() - elapsedMs;
      sessionDurationMsRef.current = totalMs;

      buttonAnimation.setValue(1);
      cancelButtonAnimation.setValue(1);
      countdownAnimation.setValue(1);
      focusModeAnimation.setValue(1);
      taskDetailsAnimation.setValue(1);
      cancelOverlayAnimation.setValue(0);

      startCountdown(activeSession.endTime);
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
    selectedSessionType,
    tId,
    timerOverlayHeight,
    timerIsRunning,
  ]);

  const startSession = React.useCallback(async ({
    sessionType,
    taskId,
    durationSeconds,
  }: StartSessionInput) => {
    if (timerIsRunning || containerHeight === 0) {
      return;
    }

    if (sessionType === 'focus' && !taskId) {
      Alert.alert('Could not start session', 'Focus sessions must be linked to a task.');
      return;
    }

    const endTime = Date.now() + durationSeconds * 1000;
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user?.id) {
      Alert.alert('Could not start session', 'Missing signed-in user.');
      return;
    }

    const { data: sessionData, error: sessionError } = await supabase.rpc('start_sprint_session', {
      p_task_id: taskId,
      p_user_id: userData.user.id,
      p_session_type: sessionType,
      p_planned_duration: durationSeconds,
      p_started_at: new Date().toISOString(),
    });

    const sessionId = getSessionId(sessionData);

    if (sessionError || !sessionId) {
      Alert.alert(
        'Could not start session',
        sessionError?.message ?? 'Session could not be created.'
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(true);
    setTimerOverlayVisible(true);
    setCurrentSessionType(sessionType);

    taskDetailsAnimation.setValue(0);
    countdownAnimation.setValue(0);
    cancelOverlayAnimation.setValue(0);

    sessionStartedAtRef.current = Date.now();
    sessionDurationMsRef.current = durationSeconds * 1000;

    void SaveActiveSession({
      sessionId,
      sessionType,
      taskId,
      durationSeconds,
      endTime,
    });

    startCountdown(endTime);
    runStartSequence();
  }, [
    cancelOverlayAnimation,
    containerHeight,
    countdownAnimation,
    runStartSequence,
    startCountdown,
    taskDetailsAnimation,
    timerIsRunning,
  ]);

  const startTimerSession = React.useCallback(async () => {
    if (selectedSessionType === 'focus' && !tId) {
      return;
    }

    const totalSeconds =
      selectedDurationSeconds ??
      (showDurationPicker ? pickerDuration : (displayDurationMinutes ?? duration)) * TIMER_UNIT_IN_SECONDS;

    await startSession({
      sessionType: selectedSessionType,
      taskId: selectedSessionType === 'focus' ? (tId ?? null) : null,
      durationSeconds: totalSeconds,
    });
  }, [
    displayDurationMinutes,
    duration,
    pickerDuration,
    selectedDurationSeconds,
    selectedSessionType,
    showDurationPicker,
    startSession,
    tId,
  ]);

  const handleStartShortBreak = React.useCallback(() => {
    setPostSessionPrompt(null);
    router.replace({
      pathname: '/task/timer',
      params: {
        sessionType: 'short_break',
        durationMinutes: String(DEFAULT_SHORT_BREAK_DURATION_MINUTES),
        returnTaskId: tId ?? undefined,
      },
    });
  }, [tId]);

  const handleContinueSameTask = React.useCallback(() => {
    if (!postSessionPrompt?.returnTaskId) {
      router.replace('/');
      return;
    }

    setPostSessionPrompt(null);
    router.replace({
      pathname: '/task/timer',
      params: {
        tId: postSessionPrompt.returnTaskId,
        durationMinutes: String(DEFAULT_FOCUS_DURATION_MINUTES),
      },
    });
  }, [postSessionPrompt]);

  const handleBackToDashboard = React.useCallback(() => {
    setPostSessionPrompt(null);
    router.replace('/');
  }, []);

  const handleChooseCustomDuration = React.useCallback(() => {
    if (timerIsRunning || selectedSessionType !== 'focus') {
      return;
    }

    router.replace({
      pathname: '/task/timer',
      params: {
        tId: tId ?? undefined,
        sessionType: 'focus',
        chooseDuration: 'true',
        durationMinutes: String(displayDurationMinutes ?? duration),
      },
    });
  }, [displayDurationMinutes, duration, selectedSessionType, tId, timerIsRunning]);

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

  const handleTimerPickerMomentumEnd = React.useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (timerIsRunning) {
        return;
      }

      const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_SIZE);
      const clampedIndex = Math.max(0, Math.min(index, TIMER_OPTIONS.length - 1));
      const nextDuration = TIMER_OPTIONS[clampedIndex];

      setPickerDuration(nextDuration);
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

      const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.38, 1, 0.38],
      });

      const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.72, 1, 0.72],
      });

      return (
        <View style={styles.timerOptionItem}>
          <Animated.Text
            style={[
              styles.timerOptionText,
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
    [scrollX]
  );

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
        title: timerIsRunning ? '' : `${getSessionLabel(selectedSessionType)} duration`,
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
            {selectedSessionType === 'focus' ? (
              <Text className="text-text-main text-xl">Sprint</Text>
            ) : null}
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
            <Text className="text-text-main text-xl">Hold to end session</Text>
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

      {!timerIsRunning && showDurationPicker ? (
        <View
          style={[
            styles.timerPickerWrapper,
            {
              top: containerHeight / 3,
            },
          ]}
        >
          <Animated.FlatList
            ref={pickerListRef}
            data={TIMER_OPTIONS}
            horizontal
            bounces={false}
            keyExtractor={(item) => item.toString()}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
              useNativeDriver: true,
            })}
            onMomentumScrollEnd={handleTimerPickerMomentumEnd}
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_SIZE}
            decelerationRate="fast"
            style={styles.timerPickerList}
            contentContainerStyle={styles.timerPickerContent}
            renderItem={renderTimerItem}
            getItemLayout={(_, index) => ({
              length: ITEM_SIZE,
              offset: ITEM_SIZE * index,
              index,
            })}
            initialNumToRender={TIMER_OPTIONS.length}
          />
        </View>
      ) : !timerIsRunning ? (
        <View style={styles.fixedDurationBlock}>
          <Text style={styles.fixedDurationLabel}>
            {selectedDurationSeconds != null
              ? `${selectedDurationSeconds} sec`
              : `${displayDurationMinutes ?? duration} min`}
          </Text>
          <Text style={styles.fixedDurationDescription}>
            {selectedSessionType === 'focus'
              ? 'This sprint uses the default focus duration so you can begin immediately.'
              : 'This session uses a fixed duration so you can move straight into the next step.'}
          </Text>
          {selectedSessionType === 'focus' ? (
            <TouchableOpacity onPress={handleChooseCustomDuration} style={styles.durationPickerLink}>
              <Text style={styles.durationPickerLinkText}>Choose a different duration</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

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
        <Text style={styles.taskName}>
          {currentSessionType === 'focus' ? task?.title ?? 'Sprint' : getSessionLabel(currentSessionType)}
        </Text>
        <Text style={styles.taskDescription}>
          {currentSessionType === 'focus'
            ? task?.description || 'Focus on this task until the timer ends.'
            : 'Use this timer as a real break before starting the next focus session.'}
        </Text>
      </Animated.View>

      {postSessionPrompt ? (
        <View style={styles.postSessionOverlay}>
          <View style={styles.postSessionCard}>
            <Text style={styles.postSessionEyebrow}>Session complete</Text>
            <Text style={styles.postSessionTitle}>
              {postSessionPrompt.completedSessionType === 'focus'
                ? 'What do you want to do next?'
                : 'Break finished'}
            </Text>
            <Text style={styles.postSessionBody}>
              {postSessionPrompt.completedSessionType === 'focus'
                ? 'Take a short break, jump straight into another sprint on the same task, or head back to the dashboard.'
                : 'Jump back into the same task or head back to the dashboard.'}
            </Text>

            {postSessionPrompt.completedSessionType === 'focus' ? (
              <>
                <TouchableOpacity onPress={handleStartShortBreak} style={styles.postSessionPrimaryButton}>
                  <Text style={styles.postSessionPrimaryButtonText}>Start short break</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleContinueSameTask} style={styles.postSessionSecondaryButton}>
                  <Text style={styles.postSessionSecondaryButtonText}>Continue same task</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBackToDashboard} style={styles.postSessionTertiaryButton}>
                  <Text style={styles.postSessionTertiaryButtonText}>Back to dashboard</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity onPress={handleContinueSameTask} style={styles.postSessionPrimaryButton}>
                  <Text style={styles.postSessionPrimaryButtonText}>Continue with same task</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleBackToDashboard} style={styles.postSessionSecondaryButton}>
                  <Text style={styles.postSessionSecondaryButtonText}>Back to dashboard</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      ) : null}
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
    alignItems: 'center',
  },
  timerPickerList: {
    flexGrow: 0,
  },
  fixedDurationBlock: {
    position: 'absolute',
    top: height * 0.28,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  fixedDurationLabel: {
    color: colors.text,
    fontSize: 56,
    fontFamily: 'Menlo',
    fontWeight: '900',
    textAlign: 'center',
  },
  fixedDurationDescription: {
    color: colors.text,
    fontSize: 18,
    lineHeight: 26,
    marginTop: 16,
    textAlign: 'center',
  },
  durationPickerLink: {
    marginTop: 18,
    minHeight: 42,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  durationPickerLinkText: {
    color: '#F3EBDD',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  timerPickerContent: {
    paddingHorizontal: ITEM_SPACING,
  },
  timerOptionItem: {
    width: ITEM_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerOptionText: {
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
  postSessionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 26, 34, 0.94)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  postSessionCard: {
    borderRadius: 28,
    backgroundColor: '#F7F4EA',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  postSessionEyebrow: {
    color: '#7A6F5A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  postSessionTitle: {
    color: '#323F4E',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 10,
  },
  postSessionBody: {
    color: '#52606D',
    fontSize: 17,
    lineHeight: 25,
    marginTop: 12,
    marginBottom: 24,
  },
  postSessionPrimaryButton: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#323F4E',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  postSessionPrimaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  postSessionSecondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#C2B8A3',
    backgroundColor: '#EFE7D8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  postSessionSecondaryButtonText: {
    color: '#323F4E',
    fontSize: 16,
    fontWeight: '700',
  },
  postSessionTertiaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  postSessionTertiaryButtonText: {
    color: '#52606D',
    fontSize: 15,
    fontWeight: '700',
  },
});
