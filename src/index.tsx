import type { EventSubscription } from 'react-native';
import NativeCompassHeading, { type HeadingData } from './NativeCompassHeading';

export type { HeadingData } from './NativeCompassHeading';

let listener: EventSubscription | undefined;

async function start(
  degreeUpdateRate: number | null,
  callback: (data: HeadingData) => void
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
  if (listener) {
    listener.remove();
    listener = undefined;
    NativeCompassHeading.stop();
  }

  const subscription = NativeCompassHeading.onHeadingUpdated(callback);
  listener = subscription;
  try {
    return await NativeCompassHeading.start(rate);
  } catch (error) {
    if (listener === subscription) {
      subscription.remove();
      listener = undefined;
      NativeCompassHeading.stop();
    }
    throw error;
  }
}

async function stop(): Promise<void> {
  listener?.remove();
  listener = undefined;
  NativeCompassHeading.stop();
}

export default {
  start,
  stop,
  hasCompass: (): Promise<boolean> => NativeCompassHeading.hasCompass(),
};
