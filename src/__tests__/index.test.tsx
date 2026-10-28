import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  PermissionsAndroid,
  Platform,
  type PermissionStatus,
} from 'react-native';
import CompassHeading, { type HeadingData, type HeadingError } from '../index';
import NativeCompassHeading from '../NativeCompassHeading';

jest.mock('../NativeCompassHeading', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    hasCompass: jest.fn(),
    onHeadingUpdated: jest.fn(),
    onError: jest.fn(),
  },
}));

const native = jest.mocked(NativeCompassHeading);
const callbacks = new Set<(data: HeadingData) => void>();
const errorCallbacks = new Set<(error: HeadingError) => void>();
const reading: HeadingData = { heading: 123, accuracy: 5 };
const locationError: HeadingError = {
  code: 'location_unavailable',
  message: 'Could not obtain a location for true north',
};

type PermissionResults = Awaited<
  ReturnType<typeof PermissionsAndroid.requestMultiple>
>;

function permissionResults(
  coarse: PermissionStatus,
  fine: PermissionStatus
): PermissionResults {
  return Object.fromEntries(
    Object.values(PermissionsAndroid.PERMISSIONS).map((permission) => [
      permission,
      permission === PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        ? coarse
        : permission === PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          ? fine
          : 'denied',
    ])
  ) as PermissionResults;
}

function emitHeading() {
  callbacks.forEach((callback) => callback(reading));
}

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'ios');
  native.start.mockResolvedValue(true);
  native.onHeadingUpdated.mockImplementation((callback) => {
    callbacks.add(callback);
    return {
      remove: jest.fn(() => {
        callbacks.delete(callback);
      }),
    };
  });
  native.onError.mockImplementation((callback) => {
    errorCallbacks.add(callback);
    return {
      remove: jest.fn(() => {
        errorCallbacks.delete(callback);
      }),
    };
  });
});

afterEach(async () => {
  await CompassHeading.stop();
  jest.resetAllMocks();
  jest.restoreAllMocks();
  callbacks.clear();
  errorCallbacks.clear();
});

describe('CompassHeading', () => {
  it('starts native updates and forwards heading and accuracy', async () => {
    const callback = jest.fn<(data: HeadingData) => void>();
    native.start.mockImplementation(async () => {
      emitHeading();
      return true;
    });

    await expect(CompassHeading.start(3, callback)).resolves.toBe(true);

    expect(native.start).toHaveBeenCalledWith(3, false);
    expect(callback).toHaveBeenCalledWith({ heading: 123, accuracy: 5 });
  });

  it.each([0, 0.5, 3])(
    'passes the degree filter %s to native',
    async (rate) => {
      await CompassHeading.start(rate, jest.fn());
      expect(native.start).toHaveBeenCalledWith(rate, false);
    }
  );

  it('preserves the null update rate as zero', async () => {
    await CompassHeading.start(null, jest.fn());
    expect(native.start).toHaveBeenCalledWith(0, false);
  });

  it('opts into true north on iOS without using Android permissions', async () => {
    const request = jest.spyOn(PermissionsAndroid, 'requestMultiple');
    await CompassHeading.start(3, jest.fn(), { useTrueNorth: true });

    expect(native.start).toHaveBeenCalledWith(3, true);
    expect(request).not.toHaveBeenCalled();
  });

  it('does not request Android location permission for magnetic heading', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const request = jest.spyOn(PermissionsAndroid, 'requestMultiple');
    await CompassHeading.start(3, jest.fn(), { useTrueNorth: false });

    expect(native.start).toHaveBeenCalledWith(3, false);
    expect(request).not.toHaveBeenCalled();
  });

  it.each(['coarse', 'fine'])(
    'accepts Android %s location permission for true north',
    async (permission) => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const { ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION } =
        PermissionsAndroid.PERMISSIONS;
      const request = jest
        .spyOn(PermissionsAndroid, 'requestMultiple')
        .mockResolvedValue(
          permissionResults(
            permission === 'coarse' ? 'granted' : 'denied',
            permission === 'fine' ? 'granted' : 'denied'
          )
        );
      await CompassHeading.start(3, jest.fn(), { useTrueNorth: true });

      expect(request).toHaveBeenCalledWith([
        ACCESS_COARSE_LOCATION,
        ACCESS_FINE_LOCATION,
      ]);
      expect(native.start).toHaveBeenCalledWith(3, true);
    }
  );

  it.each(['denied', 'never_ask_again'] as const)(
    'rejects Android permission result %s without starting sensors',
    async (result) => {
      jest.replaceProperty(Platform, 'OS', 'android');
      jest
        .spyOn(PermissionsAndroid, 'requestMultiple')
        .mockResolvedValue(permissionResults(result, result));

      await expect(
        CompassHeading.start(3, jest.fn(), { useTrueNorth: true })
      ).rejects.toMatchObject({ code: 'permission_denied' });
      expect(native.start).not.toHaveBeenCalled();
      expect(callbacks.size).toBe(0);
      expect(errorCallbacks.size).toBe(0);
    }
  );

  it('propagates Android permission request errors', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const failure = new Error('No current activity');
    jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockRejectedValue(failure);

    await expect(
      CompassHeading.start(3, jest.fn(), { useTrueNorth: true })
    ).rejects.toBe(failure);
    expect(native.start).not.toHaveBeenCalled();
  });

  it.each(['stop', 'restart'])(
    'does not start after a pending permission request is cancelled by %s',
    async (action) => {
      jest.replaceProperty(Platform, 'OS', 'android');
      const pending = Promise.withResolvers<PermissionResults>();
      jest
        .spyOn(PermissionsAndroid, 'requestMultiple')
        .mockReturnValueOnce(pending.promise);
      const first = jest.fn();
      const starting = CompassHeading.start(3, first, {
        useTrueNorth: true,
      }).catch((error: unknown) => error);

      if (action === 'stop') {
        await CompassHeading.stop();
      } else {
        await CompassHeading.start(5, jest.fn());
      }
      pending.resolve(permissionResults('granted', 'denied'));

      await expect(starting).resolves.toMatchObject({
        code: 'start_cancelled',
      });
      expect(native.start).toHaveBeenCalledTimes(action === 'stop' ? 0 : 1);
      emitHeading();
      expect(first).not.toHaveBeenCalled();
    }
  );

  it('delivers runtime errors to the supplied error callback', async () => {
    const onError = jest.fn();
    await CompassHeading.start(3, jest.fn(), { useTrueNorth: true, onError });
    errorCallbacks.forEach((callback) => callback(locationError));
    expect(onError).toHaveBeenCalledWith(locationError);
  });

  it('logs runtime errors when no error callback is supplied', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    await CompassHeading.start(3, jest.fn());
    errorCallbacks.forEach((callback) => callback(locationError));
    expect(log).toHaveBeenCalledWith(
      `CompassHeading: ${locationError.code}: ${locationError.message}`
    );
  });

  it.each([
    { options: null },
    { options: [] },
    { options: { useTrueNorth: 'true' } },
    { options: { onError: 1 } },
  ])(
    'rejects invalid options $options without interrupting existing updates',
    async ({ options }) => {
      const callback = jest.fn();
      await CompassHeading.start(3, callback);
      // @ts-expect-error Verify options validation for JavaScript callers.
      await expect(CompassHeading.start(3, jest.fn(), options)).rejects.toThrow(
        TypeError
      );
      emitHeading();
      expect(callback).toHaveBeenCalledWith(reading);
      expect(native.stop).not.toHaveBeenCalled();
    }
  );

  it.each(['stop', 'restart', 'failed start'])(
    'removes the previous error callback after %s',
    async (action) => {
      const onError = jest.fn();
      await CompassHeading.start(3, jest.fn(), { onError });
      if (action === 'stop') {
        await CompassHeading.stop();
      } else if (action === 'restart') {
        await CompassHeading.start(3, jest.fn(), { onError: jest.fn() });
      } else {
        native.start.mockRejectedValueOnce(new Error('Cannot start'));
        await expect(
          CompassHeading.start(3, jest.fn(), { onError })
        ).rejects.toThrow('Cannot start');
      }

      errorCallbacks.forEach((callback) => callback(locationError));
      expect(onError).not.toHaveBeenCalled();
      expect(errorCallbacks.size).toBe(action === 'restart' ? 1 : 0);
    }
  );

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
    expect(errorCallbacks.size).toBe(1);
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
    expect(errorCallbacks.size).toBe(0);
  });

  it('can stop repeatedly without an active subscription', async () => {
    await CompassHeading.stop();
    await CompassHeading.stop();
    expect(callbacks.size).toBe(0);
    expect(errorCallbacks.size).toBe(0);
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

  it.each(['not_available', 'failed_start'])(
    'propagates native sensor error %s and removes both subscriptions',
    async (code) => {
      const failure = Object.assign(new Error('Cannot start compass sensors'), {
        code,
      });
      native.start.mockRejectedValueOnce(failure);

      await expect(CompassHeading.start(3, jest.fn())).rejects.toBe(failure);
      expect(callbacks.size).toBe(0);
      expect(errorCallbacks.size).toBe(0);
      expect(native.stop).toHaveBeenCalledTimes(1);
    }
  );

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
