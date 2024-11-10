"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
const LINKING_ERROR = `The package 'react-native-compass-heading' doesn't seem to be linked. Make sure: \n\n` + _reactNative.Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n';
const CompassHeading = _reactNative.NativeModules.CompassHeading ? _reactNative.NativeModules.CompassHeading : new Proxy({}, {
  get() {
    throw new Error(LINKING_ERROR);
  }
});
let listener = null;
let _start = CompassHeading.start;
CompassHeading.start = async (update_rate, callback) => {
  console.log('CompassHeading.start called with update rate:', update_rate);
  if (listener) {
    console.log('Removing existing listener before starting...');
    await CompassHeading.stop(); // Clean up previous listener
  }
  const compassEventEmitter = new _reactNative.NativeEventEmitter(CompassHeading);
  listener = compassEventEmitter.addListener('HeadingUpdated', data => {
    console.log('Received heading update:', data); // Debug incoming data
    callback(data);
  });
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
var _default = exports.default = CompassHeading;
//# sourceMappingURL=index.js.map