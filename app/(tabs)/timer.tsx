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
const placeholderTask = {
  name: 'Read chapter 4',
  description: 'Focus on the summary questions and write down anything unclear.',
};

/*
Har bare skrevet timeren som en egen tab til å begynne med.
Planen er at når bruker starter en task så vil de få opp denne timeren
som viser TaskName og Description der tallene står nå
Kanskje en animert figur hvis vi får tid
*/ 
export default function App() {
  const [containerHeight, setContainerHeight] = React.useState(0)
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const [duration, setDuration] = React.useState(timers[0])
  const [isRunning, setIsRunning] = React.useState(false)
  const timerAnimation = React.useRef(new Animated.Value(0)).current
  const buttonAnimation = React.useRef(new Animated.Value(0)).current
  const taskDetailsAnimation = React.useRef(new Animated.Value(0)).current
  const animation = React.useCallback(() => {
    if (isRunning) {
        return;
    }

    setIsRunning(true);
    taskDetailsAnimation.setValue(0);

    Animated.sequence([
        Animated.parallel([
            Animated.timing(buttonAnimation, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            }),
            Animated.timing(taskDetailsAnimation, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            }),
        ]),
        Animated.timing(timerAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
        }),
        Animated.timing(timerAnimation, {
            toValue: containerHeight,
            duration: duration * 1000,
            useNativeDriver: true
        }),
    ]) .start(({ finished }) => {
        if (!finished) {
            setIsRunning(false);
            return;
        }

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
        ]).start(() => {
            setIsRunning(false);
        })
    })
  }, [buttonAnimation, duration, isRunning, taskDetailsAnimation, timerAnimation])

  React.useEffect(() => {
      if (containerHeight > 0) {
        timerAnimation.setValue(containerHeight);
      }
    })

  const opacity = buttonAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0]
  })
  const translateY = buttonAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 200]
  })
  const inactiveTimerNumberOpacity = buttonAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0]
  })
  const taskDetailsOpacity = taskDetailsAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1]
  })
  const taskDetailsTranslateY = taskDetailsAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0]
  })
      
return (
  <View style={styles.container}
  onLayout={(event) => {
    setContainerHeight(event.nativeEvent.layout.height);
  }}>
    <StatusBar hidden />
    <Animated.View 
    style={[StyleSheet.absoluteFillObject, {
      height,
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
        disabled={isRunning}
        onPress={animation}>
        <View
          style={styles.roundButton}
        />
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
        keyExtractor={item => item.toString()}
        horizontal
        bounces={false}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {x: scrollX}}}],
          { useNativeDriver: true}
        )}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={ev => {
          const index = Math.round(ev.nativeEvent.contentOffset.x / ITEM_SIZE)
          setDuration(timers[index]);
        }}
        snapToInterval={ITEM_SIZE}
        decelerationRate={"fast"}
        style={{flexGrow: 0}}
        contentContainerStyle={{
          paddingHorizontal: ITEM_SPACING
        }}
        renderItem={({item, index}) => {
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
              Animated.multiply(selectedOpacity, buttonAnimation)
          )
          const scale = scrollX.interpolate({
              inputRange,
              outputRange: [.7, 1, .7]
          })
          return <View style={{width: ITEM_SIZE, justifyContent: 'center', alignItems: 'center'}}>
              <Animated.Text style={[styles.text, {
                  opacity,
                  transform: [{
                      scale
                  }]

              }]}>
                  {item}
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
    backgroundColor: colors.red,
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
  }
});
