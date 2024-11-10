"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
// src/index.tsx

const {
  CompassHeading
} = _reactNative.NativeModules;
const compassEventEmitter = new _reactNative.NativeEventEmitter(CompassHeading);
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
var _default = exports.default = CompassHeadingModule;
//# sourceMappingURL=index.js.map