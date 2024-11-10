import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'react-native-compass-heading' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const CompassHeading = NativeModules.CompassHeading
  ? NativeModules.CompassHeading
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

let listener: { remove: () => any } | null = null;

let _start = CompassHeading.start;

type dataType = {
  heading: number;
  accuracy: number;
};

CompassHeading.start = async (
  update_rate: number,
  callback: (data: dataType) => void
) => {
  console.log('CompassHeading.start called with update rate:', update_rate);

  if (listener) {
    console.log('Removing existing listener before starting...');
    await CompassHeading.stop(); // Clean up previous listener
  }

  const compassEventEmitter = new NativeEventEmitter(CompassHeading);
  listener = compassEventEmitter.addListener(
    'HeadingUpdated',
    (data: dataType) => {
      console.log('Received heading update:', data); // Debug incoming data
      callback(data);
    }
  );

  const result = await _start(update_rate === null ? 0 : update_rate);
  console.log('CompassHeading started successfully');
  return result;
};

let _stop = CompassHeading.stop;
CompassHeading.stop = async () => {
  if (listener) {
    console.log('Removing listener and stopping updates...');
    listener.remove();
    listener = null;
  }
  await _stop();
  console.log('CompassHeading stopped successfully');
};

export default CompassHeading;
