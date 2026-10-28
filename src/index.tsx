import {
  PermissionsAndroid,
  Platform,
  type EventSubscription,
} from 'react-native';
import NativeCompassHeading, {
  type HeadingData,
  type HeadingError,
} from './NativeCompassHeading';

export type { HeadingData, HeadingError } from './NativeCompassHeading';

export type StartOptions = {
  useTrueNorth?: boolean;
  onError?: (error: HeadingError) => void;
};

let listener: EventSubscription | undefined;
let errorListener: EventSubscription | undefined;
let requestId = 0;

async function start(
  degreeUpdateRate: number | null,
  callback: (data: HeadingData) => void,
  options: StartOptions = {}
): Promise<boolean> {
  const rate = degreeUpdateRate ?? 0;
  if (!Number.isFinite(rate) || rate < 0) {
    throw new RangeError(
      'degreeUpdateRate must be a finite, non-negative number'
    );
  }
  if (typeof callback !== 'function') {
    throw new TypeError('callback must be a function');
  }
  if (
    options === null ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    (options.useTrueNorth !== undefined &&
      typeof options.useTrueNorth !== 'boolean') ||
    (options.onError !== undefined && typeof options.onError !== 'function')
  ) {
    throw new TypeError(
      'options must contain an optional boolean useTrueNorth and function onError'
    );
  }
  const currentRequest = ++requestId;
  if (listener) {
    listener.remove();
    listener = undefined;
    errorListener?.remove();
    errorListener = undefined;
    NativeCompassHeading.stop();
  }

  const useTrueNorth = options.useTrueNorth ?? false;
  if (useTrueNorth && Platform.OS === 'android') {
    const permissions = PermissionsAndroid.PERMISSIONS;
    const results = await PermissionsAndroid.requestMultiple([
      permissions.ACCESS_COARSE_LOCATION,
      permissions.ACCESS_FINE_LOCATION,
    ]);
    if (currentRequest !== requestId) {
      throw Object.assign(new Error('Compass start was cancelled'), {
        code: 'start_cancelled',
      });
    }
    if (
      results[permissions.ACCESS_COARSE_LOCATION] !==
        PermissionsAndroid.RESULTS.GRANTED &&
      results[permissions.ACCESS_FINE_LOCATION] !==
        PermissionsAndroid.RESULTS.GRANTED
    ) {
      throw Object.assign(
        new Error('Location permission is required for true north'),
        { code: 'permission_denied' }
      );
    }
  }

  const subscription = NativeCompassHeading.onHeadingUpdated(callback);
  const errorSubscription = NativeCompassHeading.onError(
    options.onError ??
      ((error) =>
        console.error(`CompassHeading: ${error.code}: ${error.message}`))
  );
  listener = subscription;
  errorListener = errorSubscription;
  try {
    return await NativeCompassHeading.start(rate, useTrueNorth);
  } catch (error) {
    if (listener === subscription) {
      subscription.remove();
      errorSubscription.remove();
      listener = undefined;
      errorListener = undefined;
      NativeCompassHeading.stop();
    }
    throw error;
  }
}

async function stop(): Promise<void> {
  ++requestId;
  listener?.remove();
  errorListener?.remove();
  listener = undefined;
  errorListener = undefined;
  NativeCompassHeading.stop();
}

export default {
  start,
  stop,
  hasCompass: (): Promise<boolean> => NativeCompassHeading.hasCompass(),
};
