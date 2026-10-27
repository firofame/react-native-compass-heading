import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import CompassHeading, { type HeadingData } from '../index';
import NativeCompassHeading from '../NativeCompassHeading';

jest.mock('../NativeCompassHeading', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    hasCompass: jest.fn(),
    onHeadingUpdated: jest.fn(),
  },
}));

const native = jest.mocked(NativeCompassHeading);
const callbacks = new Set<(data: HeadingData) => void>();
const reading: HeadingData = { heading: 123, accuracy: 5 };

function emitHeading() {
  callbacks.forEach((callback) => callback(reading));
}

beforeEach(() => {
  native.start.mockResolvedValue(true);
  native.onHeadingUpdated.mockImplementation((callback) => {
    callbacks.add(callback);
    return {
      remove: jest.fn(() => {
        callbacks.delete(callback);
      }),
    };
  });
});

afterEach(async () => {
  await CompassHeading.stop();
  jest.resetAllMocks();
  callbacks.clear();
});

describe('CompassHeading', () => {
  it('starts native updates and forwards heading and accuracy', async () => {
    const callback = jest.fn<(data: HeadingData) => void>();
    native.start.mockImplementation(async () => {
      emitHeading();
      return true;
    });

    await expect(CompassHeading.start(3, callback)).resolves.toBe(true);

    expect(native.start).toHaveBeenCalledWith(3);
    expect(callback).toHaveBeenCalledWith({ heading: 123, accuracy: 5 });
  });

  it.each([0, 0.5, 3])(
    'passes the degree filter %s to native',
    async (rate) => {
      await CompassHeading.start(rate, jest.fn());
      expect(native.start).toHaveBeenCalledWith(rate);
    }
  );

  it('preserves the null update rate as zero', async () => {
    await CompassHeading.start(null, jest.fn());
    expect(native.start).toHaveBeenCalledWith(0);
  });

  it.each([-1, NaN, Infinity, -Infinity])(
    'rejects invalid rate %s',
    async (rate) => {
      await expect(CompassHeading.start(rate, jest.fn())).rejects.toThrow(
        'degreeUpdateRate must be a finite, non-negative number'
      );
      expect(native.start).not.toHaveBeenCalled();
      expect(native.onHeadingUpdated).not.toHaveBeenCalled();
    }
  );

  it('rejects a missing callback before subscribing', async () => {
    // @ts-expect-error Verify the runtime guard for JavaScript callers.
    await expect(CompassHeading.start(3)).rejects.toThrow(
      'callback must be a function'
    );
    expect(native.onHeadingUpdated).not.toHaveBeenCalled();
  });

  it('replaces the previous listener when restarted', async () => {
    const first = jest.fn();
    const second = jest.fn();
    await CompassHeading.start(3, first);
    await CompassHeading.start(5, second);
    emitHeading();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(1);
  });

  it('does not interrupt a running subscription for invalid input', async () => {
    const callback = jest.fn();
    await CompassHeading.start(3, callback);
    await expect(CompassHeading.start(-1, jest.fn())).rejects.toThrow(
      RangeError
    );
    emitHeading();

    expect(callback).toHaveBeenCalledWith(reading);
    expect(native.stop).not.toHaveBeenCalled();
  });

  it('removes the subscription and stops native updates', async () => {
    const callback = jest.fn();
    await CompassHeading.start(3, callback);
    await expect(CompassHeading.stop()).resolves.toBeUndefined();
    emitHeading();

    expect(callback).not.toHaveBeenCalled();
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(0);
  });

  it('can stop repeatedly without an active subscription', async () => {
    await CompassHeading.stop();
    await CompassHeading.stop();
    expect(callbacks.size).toBe(0);
  });

  it('cleans up a failed start and allows retrying', async () => {
    const failure = new Error('Compass unavailable');
    native.start.mockRejectedValueOnce(failure);
    await expect(CompassHeading.start(3, jest.fn())).rejects.toBe(failure);
    expect(callbacks.size).toBe(0);
    expect(native.stop).toHaveBeenCalledTimes(1);

    await expect(CompassHeading.start(3, jest.fn())).resolves.toBe(true);
    expect(callbacks.size).toBe(1);
  });

  it('does not remove a replacement listener when an earlier start fails', async () => {
    const pending = Promise.withResolvers<boolean>();
    native.start.mockReturnValueOnce(pending.promise);
    const firstResult = CompassHeading.start(3, jest.fn()).catch(
      (error: unknown) => error
    );
    const failure = new Error('Earlier start failed');
    const callback = jest.fn();
    await CompassHeading.start(5, callback);
    pending.reject(failure);
    await expect(firstResult).resolves.toBe(failure);
    emitHeading();

    expect(callback).toHaveBeenCalledWith(reading);
    expect(native.stop).toHaveBeenCalledTimes(1);
    expect(callbacks.size).toBe(1);
  });

  it('keeps updates stopped when a pending start resolves', async () => {
    const pending = Promise.withResolvers<boolean>();
    native.start.mockReturnValueOnce(pending.promise);
    const callback = jest.fn();
    const starting = CompassHeading.start(3, callback);
    await CompassHeading.stop();
    pending.resolve(true);
    await starting;
    emitHeading();

    expect(callback).not.toHaveBeenCalled();
    expect(callbacks.size).toBe(0);
  });

  it.each([true, false])(
    'reports native compass availability: %s',
    async (available) => {
      native.hasCompass.mockResolvedValueOnce(available);
      await expect(CompassHeading.hasCompass()).resolves.toBe(available);
    }
  );

  it('propagates availability errors', async () => {
    const failure = new Error('Cannot query sensors');
    native.hasCompass.mockRejectedValueOnce(failure);
    await expect(CompassHeading.hasCompass()).rejects.toBe(failure);
  });
});
