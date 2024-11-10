// src/index.tsx
import { NativeModules, NativeEventEmitter } from 'react-native';

const { CompassHeading } = NativeModules;
const compassEventEmitter = new NativeEventEmitter(CompassHeading);

type CallbackType = (heading: number, accuracy: number) => void;

const CompassHeadingModule = {
  start: (degreeUpdateRate: number, callback: CallbackType): void => {
    CompassHeading.start(degreeUpdateRate);

    const subscription = compassEventEmitter.addListener(
      'HeadingUpdated',
      ({ heading, accuracy }) => {
        callback(heading, accuracy);
      }
    );

    // Set up `unsubscribe` function to stop listening when needed
    const unsubscribe = () => {
      subscription.remove();
      CompassHeading.stop();
    };

    return unsubscribe();
  },

  stop: (): void => {
    CompassHeading.stop();
  },
};

export default CompassHeadingModule;
