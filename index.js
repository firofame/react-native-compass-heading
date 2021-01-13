import { NativeModules, NativeEventEmitter } from 'react-native';

const { CompassHeading } = NativeModules;

let listener;

//Monkey patching
let _start = CompassHeading.start;
CompassHeading.start = async (update_rate, callback) => {
  if (listener) {
    await CompassHeading.stop();
  }

  const compassEventEmitter = new NativeEventEmitter(CompassHeading);
  listener = compassEventEmitter.addListener('HeadingUpdated', (degree) => {
    callback(degree);
  });

  return await _start(update_rate === null ? 0 : update_rate);
}

let _stop = CompassHeading.stop;
CompassHeading.stop = async () => {
  listener && listener.remove();
  listener = null;
  await _stop();
}

export default CompassHeading;
