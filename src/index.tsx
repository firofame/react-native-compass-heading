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

  if (listener) {
    await CompassHeading.stop(); // Clean up previous listener
  }

  const compassEventEmitter = new NativeEventEmitter(CompassHeading);
  listener = compassEventEmitter.addListener(
    'HeadingUpdated',
    (data: dataType) => {
      callback(data);
    }
  );

  const result = await _start(update_rate === null ? 0 : update_rate);
  return result;
};

let _stop = CompassHeading.stop;
CompassHeading.stop = async () => {
  if (listener) {
    listener.remove();
    listener = null;
  }
  await _stop();
};

export default CompassHeading;
