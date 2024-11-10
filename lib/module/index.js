"use strict";

// src/index.tsx
import { NativeModules, NativeEventEmitter } from 'react-native';
const {
  CompassHeading
} = NativeModules;
const compassEventEmitter = new NativeEventEmitter(CompassHeading);
const CompassHeadingModule = {
  start: (degreeUpdateRate, callback) => {
    CompassHeading.start(degreeUpdateRate);
    const subscription = compassEventEmitter.addListener('HeadingUpdated', ({
      heading,
      accuracy
    }) => {
      callback(heading, accuracy);
    });

    // Set up `unsubscribe` function to stop listening when needed
    const unsubscribe = () => {
      subscription.remove();
      CompassHeading.stop();
    };
    return unsubscribe();
  },
  stop: () => {
    CompassHeading.stop();
  }
};
export default CompassHeadingModule;
//# sourceMappingURL=index.js.map