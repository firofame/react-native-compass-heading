import { NativeModules, NativeEventEmitter } from 'react-native';

const { CompassHeading } = NativeModules;

let listener;

//Monkey patching
let _start = CompassHeading.start;
CompassHeading.start = (update_rate, callback) => {
  if (listener) {
    CompassHeading.stop();
  }

  const compassEventEmitter = new NativeEventEmitter(CompassHeading);
  listener = compassEventEmitter.addListener('HeadingUpdated', (degree) => {
    callback(degree);
  });

  _start(update_rate === null ? 0 : update_rate);
}

let _stop = CompassHeading.stop;
CompassHeading.stop = () => {
  listener && listener.remove();
  listener = null;
  _stop();
}

export default CompassHeading;
