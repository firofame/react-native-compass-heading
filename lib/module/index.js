"use strict";

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
const LINKING_ERROR = `The package 'react-native-compass-heading' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n';
const CompassHeading = NativeModules.CompassHeading ? NativeModules.CompassHeading : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  }
});
let listener = null;
let _start = CompassHeading.start;
CompassHeading.start = async (update_rate, callback) => {
  if (listener) {
    await CompassHeading.stop(); // Clean up previous listener
  }
  const compassEventEmitter = new NativeEventEmitter(CompassHeading);
  listener = compassEventEmitter.addListener('HeadingUpdated', data => {
    callback(data);
  });
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
//# sourceMappingURL=index.js.map