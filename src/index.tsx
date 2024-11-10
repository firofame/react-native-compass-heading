// src/index.tsx
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { useEffect } from 'react';

const { CompassHeading } = NativeModules;

type CompassHeadingEvent = {
  heading: number;
  accuracy: number;
};

type CompassHeadingType = {
  start: (degreeUpdateRate: number, callback: (event: CompassHeadingEvent) => void) => void;
  stop: () => void;
};

const compassHeading: CompassHeadingType = {
  start: (degreeUpdateRate, callback) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      CompassHeading.start(degreeUpdateRate);
      const eventEmitter = new NativeEventEmitter(CompassHeading);
      const subscription = eventEmitter.addListener('HeadingUpdated', callback);

      // Cleanup listener
      return () => {
        subscription.remove();
        CompassHeading.stop();
      };
    } else {
      console.warn('CompassHeading is only available on iOS and Android platforms.');
    }
  },

  stop: () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      CompassHeading.stop();
    }
  }
};

export default compassHeading;

// Usage in a React component
export const useCompassHeading = (degreeUpdateRate: number, callback: (event: CompassHeadingEvent) => void) => {
  useEffect(() => {
    const unsubscribe = compassHeading.start(degreeUpdateRate, callback);

    // Clean up the effect by stopping the compass updates when component unmounts
    return () => {
      unsubscribe?.();
    };
  }, [degreeUpdateRate, callback]);
};