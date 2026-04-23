import * as React from 'react';
import {
  Animated,
  Dimensions,
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

const timers = [...Array(13).keys()].map((i) => (i === 0 ? 1 : i * 5));
const ITEM_SIZE = width * 0.38;
const ITEM_SPACING = (width - ITEM_SIZE) / 2;
const TIMER_UNIT_IN_SECONDS = 1; // Set to 60 for timer value to represent minutes
const placeholderTask = {
  name: 'Read chapter 4',
  description: 'Focus on the summary questions and write down anything unclear.',
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${
    seconds.toString().padStart(2, '0')}`;
}

export default function App() {
  const [containerHeight, setContainerHeight] = React.useState(0)
  const [duration, setDuration] = React.useState(timers[0])
  const [timerIsRunning, setIsRunning] = React.useState(false)
  const [timeRemaining, setTimeRemaining] = React.useState(0)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [showCountdownText, setShowCountdownText] = React.useState(false)
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const timerAnimation = React.useRef(new Animated.Value(0)).current;
  const buttonAnimation = React.useRef(new Animated.Value(0)).current;
  const taskDetailsAnimation = React.useRef(new Animated.Value(0)).current;
  const countdownAnimation = React.useRef(new Animated.Value(0)).current;
  const countdownRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const runningAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);
  const cancelButtonAnimation = React.useRef(new Animated.Value(0)).current;
  const cancelProgressAnimation  = React.useRef(new Animated.Value(0)).current;
 
  const animation = React.useCallback(() => {
    if (timerIsRunning || containerHeight === 0) {
        return;
    }
    setIsRunning(true);
    setShowCountdownText(true);
    taskDetailsAnimation.setValue(0);
    countdownAnimation.setValue(0);
    cancelProgressAnimation.setValue(0);

    const totalSeconds = duration * TIMER_UNIT_IN_SECONDS;
    setTimeRemaining(totalSeconds);

    if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    countdownRef.current = setInterval(() => {
      setTimeRemaining((currentTime) => {
        if (currentTime <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          return 0;
          }
         return currentTime -1;
        });
    }, 1000);

    const runningAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(buttonAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(cancelButtonAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(taskDetailsAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(countdownAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
      ]),
      Animated.timing(timerAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.parallel([
        Animated.timing(timerAnimation, {
        toValue: containerHeight,
        duration: totalSeconds * 1000,
        useNativeDriver: true
      }),
      Animated.timing(cancelProgressAnimation, {
        toValue: 1,
        duration: totalSeconds *  1000,
        useNativeDriver: false,
      }),
      ]),
    ]);
    runningAnimationRef.current = runningAnimation;

    runningAnimation.start(({ finished }) => {
      runningAnimationRef.current = null;
      
      if (!finished) {
        return;
      }

      Animated.timing(countdownAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        setShowCountdownText(false);
    
        Animated.parallel([
          Animated.timing(buttonAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(taskDetailsAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(cancelButtonAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          }),
      ]).start(() => {
        setIsRunning(false);
        /* TODO
          Implement store and send of ellapsed time value in seconds to DB
          for total time spent statistic
        */
      })
    })
  });
}, [cancelProgressAnimation, cancelButtonAnimation, countdownAnimation, 
  buttonAnimation, containerHeight, duration, timerIsRunning, taskDetailsAnimation, 
  timerAnimation, showCountdownText]);

  React.useEffect(() => {
      if (containerHeight > 0 && !timerIsRunning) {
        timerAnimation.setValue(containerHeight);
      }
    }, [containerHeight, timerIsRunning, timerAnimation])

    const timerOverlayOpacity = React.useRef(new Animated.Value(1)).current;
    const cancelButtonOpacity = cancelButtonAnimation;
    const cancelButtonTranslateY = cancelButtonAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 0],
    });
    const opacity = buttonAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0]
    });
    const translateY = buttonAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 200]
    });
    const inactiveTimerNumberOpacity = buttonAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0]
    });
    const taskDetailsOpacity = taskDetailsAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1]
    });
    const taskDetailsTranslateY = taskDetailsAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0]
    });
    const cancelTimer = React.useCallback(() => {
      if (!timerIsRunning){
        return;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      runningAnimationRef.current?.stop();
      runningAnimationRef.current = null;

    
      Animated.parallel([
      Animated.timing(cancelButtonAnimation, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(taskDetailsAnimation, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true
      }),
      Animated.timing(countdownAnimation, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(timerAnimation, {
        toValue: containerHeight,
        duration: 300, 
        useNativeDriver: true
      }),
      Animated.timing(timerOverlayOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowCountdownText(false);

      Animated.timing(buttonAnimation, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true
      })
      .start(() => {
        timerAnimation.setValue(containerHeight)
        timerOverlayOpacity.setValue(1);
        cancelProgressAnimation.stopAnimation();
        cancelProgressAnimation.setValue(0);
        setTimeRemaining(0);
        setIsRunning(false);
      });
    })
  }, [timerOverlayOpacity, cancelProgressAnimation, buttonAnimation, cancelButtonAnimation,
    containerHeight, countdownAnimation, timerAnimation, timerIsRunning, taskDetailsAnimation,]);
        
return (
  <View style={styles.container}
  onLayout={(event) => {
    setContainerHeight(event.nativeEvent.layout.height);
  }}>
    <StatusBar hidden />
    <Animated.View 
    style={[StyleSheet.absoluteFillObject, {
      height: containerHeight,
      width,
      backgroundColor: colors.red,
      transform: [{
          translateY: timerAnimation
      }]
    }]}
    />
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        {
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 100,
          opacity,
          transform: [{
              translateY
          }]
        },
      ]}>
        
      <TouchableOpacity
        disabled={timerIsRunning}
        onPress={animation}>
        <View style={styles.roundButton}>
          <Text className='text-text-main text-xl'>Start</Text>
          <Text className='text-text-main text-xl'>Sprint</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
    <Animated.View
    pointerEvents={timerIsRunning? 'auto' : 'none'}
    style={[
      styles.cancelButtonContainer,
      {
        opacity: cancelButtonOpacity,
        transform: [{translateY: cancelButtonTranslateY}],
      },
    ]}>
      <TouchableOpacity onPress={cancelTimer}>
        <View style={styles.cancelButton}>
          <Animated.View style={[
            styles.cancelButtonFill, {
              width: cancelProgressAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
          />
          <Text className='text-text-main text-xl'>Cancel</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
    <View
      style={{
        position: 'absolute',
        top: containerHeight / 3,
        left: 0,
        right: 0,
        flex: 1,
      }}>
        <Animated.FlatList
        data={timers}
        scrollEnabled={!timerIsRunning}
        keyExtractor={item => item.toString()}
        horizontal
        bounces={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          { useNativeDriver: true}
        )}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={ev => {
          if (timerIsRunning) {
            return;
          }
          
          const index = Math.round(ev.nativeEvent.contentOffset.x / ITEM_SIZE)
          setSelectedIndex(index);
          setDuration(timers[index]);
        }}
        
        snapToInterval={ITEM_SIZE}
        decelerationRate={"fast"}
        style={{flexGrow: 0}}
        contentContainerStyle={{
          paddingHorizontal: ITEM_SPACING
        }}
        renderItem={({item, index}) => {
          const isSelected = index === selectedIndex;
          const timerText = showCountdownText && isSelected ? formatTime(timeRemaining) : item;
          const inputRange = [
              (index - 1) * ITEM_SIZE,
              index * ITEM_SIZE,
              (index + 1) * ITEM_SIZE,
          ]
          

          const normalOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [.4, 1, .4]
          })
          const selectedOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0, 1, 0],
              extrapolate: 'clamp'
          })
          const opacity = Animated.add(
              Animated.multiply(normalOpacity, inactiveTimerNumberOpacity),
              Animated.multiply(selectedOpacity, countdownAnimation)
          )
          const scale = scrollX.interpolate({
              inputRange,
              outputRange: [.7, 1, .7]
          })
          return <View style={{width: ITEM_SIZE, justifyContent: 'center', alignItems: 'center'}}>
              <Animated.Text style={[showCountdownText && isSelected ? styles.countdownText : styles.text, {
                  opacity,
                  transform: [{
                      scale
                  }]

              }]}>
                  {timerText}
              </Animated.Text>
            </View>
          }
        }
        />
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.taskDetails,
          {
            opacity: taskDetailsOpacity,
            transform: [{
              translateY: taskDetailsTranslateY
            }]
          }
        ]}>
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
  roundButton: {
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: '#beb9a7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  text: {
    fontSize: ITEM_SIZE * 0.8,
    fontFamily: 'Menlo',
    color: colors.text,
    fontWeight: '900',
  },
  taskDetails: {
    position: 'absolute',
    top: height * 0.56,
    left: 32,
    right: 32,
    alignItems: 'center',
  },
  taskName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  taskDescription: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: ITEM_SIZE * 0.32,
    fontFamily: 'Menlo',
    color: colors.text,
    fontWeight: '900',
  },
  cancelButtonContainer:  {
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
  cancelButtonFill: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    top: 0,
    backgroundColor: 'rgb(184, 80, 80)',
  }
});
