# react-native-compass-heading

React Native module for iOS & Android to receive compass heading

## Requirements

- React Native 0.82 or newer, with the New Architecture (Turbo Modules).
- iOS 15.1 or newer, or Android API 24 or newer.
- A physical device with compass hardware. Simulators and many emulators do not
  have the required sensors; check `hasCompass()` before starting.
- Expo projects need a development build. Expo Go is not supported.

## Installation

```sh
yarn add react-native-compass-heading
```

For iOS, install the native pods and rebuild your app:

```sh
cd ios && pod install
```

By default, the library reads **magnetic heading** without requesting location
permission. Opt into **true north** with `{ useTrueNorth: true }`; this requires
the platform location setup below.

## Usage

```tsx
import { View, Text } from 'react-native';
import { useEffect, useState } from 'react';
import CompassHeading from 'react-native-compass-heading';

export default function App() {
  const [headingValue, setHeadingValue] = useState(0);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    async function startCompass() {
      try {
        const available = await CompassHeading.hasCompass();
        if (!active) return;
        if (!available) {
          setError('No compass available on this device');
          return;
        }
        await CompassHeading.start(3, ({ heading }) => {
          if (active) setHeadingValue(heading);
        });
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      }
    }
    startCompass();
    return () => {
      active = false;
      CompassHeading.stop().catch(console.error);
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{error ?? `${headingValue} degrees`}</Text>
    </View>
  );
}
```

### API

The default export remains `CompassHeading`:

- `start(degreeUpdateRate, callback, options?): Promise<boolean>` starts updates and resolves
  to `true` when the native start request succeeds, not when the first reading
  arrives. `degreeUpdateRate` is a finite, non-negative angular change in
  **degrees**, not a time interval. Pass `0` (or `null`, for compatibility) for
  unfiltered updates. See the filtering rules below.
  `options.useTrueNorth` defaults to `false`. `options.onError` is an optional
  callback receiving `{ code: string, message: string }` for errors occurring
  after startup; without it, runtime errors are logged with `console.error`.
  The types `StartOptions` and `HeadingError` are exported.
- `stop(): Promise<void>` removes the JavaScript subscription immediately and
  requests that native sensors stop. Calling it more than once is safe. On iOS,
  native cleanup is queued on the main thread; the promise does not wait for
  that cleanup. `start()` does not return an unsubscribe function; use `stop()`
  in your cleanup.
  This also stops location updates and cancels a start waiting for permission.
  Cancellation rejects that start with code `start_cancelled`; it does not
  dismiss an operating-system permission dialog.
- `hasCompass(): Promise<boolean>` checks for heading hardware on both platforms.
  It does not start sensors or guarantee a successful start or a valid reading.

There is one shared subscription per JavaScript module, not one per component.
Starting again replaces the previous callback, restarts native updates, and
resets the degree filter. Invalid input is rejected before replacing a running
subscription. Stopping from any component stops that shared subscription.

Callbacks receive the exported TypeScript type `HeadingData`:

```ts
type HeadingData = {
  heading: number;
  accuracy: number;
};
```

`heading` is the direction of the top of the screen relative to **magnetic
north** by default, or **true north** when `useTrueNorth` is enabled. It is
normalized to `[0, 360)`: north is `0`, east `90`, south `180`, and west `270`.
The callback shape is unchanged in either mode.

### True north

True north corrects for magnetic declination using the device's location.
Magnetic mode never requests permission or starts location updates, even if
location permission was previously granted.

**iOS:** add a non-empty usage description to your app's `Info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your location is used to correct the compass heading to true north.</string>
```

**Android:** add both permissions to your app's `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

The library deliberately does not declare location permissions in its own
Android manifest, so magnetic-only apps do not acquire them. Rebuild the app
after changing native configuration. No additional location package is needed.

```ts
await CompassHeading.start(
  3,
  ({ heading, accuracy }) => {
    console.log('True heading:', heading, 'Accuracy:', accuracy);
  },
  {
    useTrueNorth: true,
    onError: ({ code, message }) => {
      console.error(code, message);
    },
  }
);
```

- Start from a foreground screen. The library requests foreground location
  access when needed. Approximate location is accepted; precise location and
  background-location access are not required.
- `start()` waits for permission, but **not** for the first location or heading.
  Denied permission, missing configuration, or disabled location providers reject
  startup. If permission was permanently denied, enable it in the app's settings
  before retrying.
- iOS starts Core Location location updates and uses `CLHeading.trueHeading`.
  Android adds `GeomagneticField` declination, computed from latitude, longitude,
  altitude (when available), and current time, to the magnetic heading.
- Both platforms wait for a valid location no more than five minutes old.
  **No magnetic-heading fallback is emitted.** If no valid true-north reading
  arrives within 30 seconds after authorized startup, `onError` receives
  `location_unavailable` and native updates stop.
- True-north permission loss or non-transient location errors also stop native
  updates and call `onError`. Call `start()` again after resolving the error.
  Call `stop()` during cleanup, including while permission or location is pending.
  Switching back to magnetic mode releases location updates.
- The location request uses kilometer-scale updates to limit power use.
  Declination models and sensor calibration differ by OS; true north is not a
  guarantee of navigational accuracy. `accuracy` retains the platform-specific
  meaning below and does not include uncertainty in the declination correction.

The example app includes a true-north toggle and both platforms' permission
configuration.

### Filtering rules (both platforms)

- The first valid reading after each start is emitted regardless of the rate.
- For a positive rate, subsequent readings are emitted only when the shortest
  angular distance from the **last emitted** heading is **strictly greater**
  than the rate. A change equal to the rate is suppressed; smaller changes
  accumulate relative to the last emitted heading, not the last sensor sample.
- The comparison happens after true-north correction (when enabled) and
  screen-orientation adjustment, and before any
  Android integer truncation. Orientation-only changes follow the same filter.
- North wraps correctly: `359` to `1` is a two-degree change, not `358` degrees.
  At rate `3`, it is suppressed; a subsequent reading of `3` is emitted because
  it is four degrees from the last emitted `359`.
- Rate `0` or `null` disables the angular filter, including for repeated
  identical headings. It does not disable native sensor processing.
- The shortest distance is at most `180` degrees, so a rate of `180` or higher
  emits only the first valid reading.

The rate does **not** control sampling frequency or guarantee a callback
interval. Sensor availability, platform scheduling, and device motion determine
when readings arrive.

### Platform-specific sensor behavior

The API and angular filtering rules are shared, but the sensor pipelines and
reported precision are intentionally different:

| Behavior            | Android                                                                                                                   | iOS                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Hardware check      | Both accelerometer and magnetometer must exist                                                                            | Core Location's `headingAvailable`                                                                                       |
| Heading calculation | Accelerometer/magnetometer rotation matrix; both vectors are low-pass filtered with `alpha = 0.97` at `SENSOR_DELAY_GAME` | Core Location's magnetic heading; no additional library smoothing                                                        |
| True-north mode     | Adds Android's `GeomagneticField` declination from location and current time                                              | Uses Core Location's `trueHeading` with location updates enabled                                                         |
| Invalid readings    | Samples without a valid rotation matrix are ignored                                                                       | Readings with negative `headingAccuracy` are ignored                                                                     |
| Reported `heading`  | Truncated to integer degrees after filtering                                                                              | Core Location's fractional degrees are preserved                                                                         |
| Reported `accuracy` | Constant `1` for compatibility; **not** an accuracy estimate                                                              | Core Location's estimated heading uncertainty in degrees                                                                 |
| Screen rotation     | Display rotation offsets `0`, `90`, `180`, `270`                                                                          | Active window scene's interface orientation: portrait `0`, upside-down `180`, landscape-left `-90`, landscape-right `90` |

Both platforms normalize headings after applying the screen rotation. When no
display/active window scene is available, no orientation offset is applied.
Because their sensor processing differs, identical motion need not produce
identical values or callback timing on Android and iOS. Use a physical device
away from magnetic interference; availability alone says nothing about accuracy.

### Validation and errors

- A negative, `NaN`, or infinite rate rejects with `RangeError`; a non-function
  callback or invalid options reject with `TypeError`. Native code also validates
  the rate. Validation does not interrupt an existing subscription.
- Missing heading hardware rejects `start()` with native code `not_available`
  on either platform. Android sensor-listener registration failure rejects with
  `failed_start`. A failed start removes its JavaScript subscription.
- Errors **after** `start()` resolves go to `options.onError`, never the heading
  callback or an already-resolved promise. Without `onError`, they are logged to
  the JavaScript console. A successful start is not a guarantee of future readings.
- True-north errors include `permission_denied`, `missing_permission_config`
  (iOS), `location_disabled`, and `location_unavailable`. iOS temporary
  location-unknown failures are logged natively while Core Location retries.
  Magnetic-mode Core Location failures use `heading_unavailable` and do not
  automatically stop heading updates.

## Migration from the legacy project

This repository was regenerated with
[`create-react-native-library`](https://oss.callstack.com/react-native-builder-bob/create)
0.64.0 using the Kotlin/Objective-C Turbo Module template, with a React Native
0.88 example app and Builder Bob 0.44.

The package name and default `start`/`stop` API are preserved. The accelerometer
and magnetometer smoothing, magnetic heading, degree filter, and display rotation
handling have been ported. `hasCompass()` is now available on iOS as well.

Compatibility changes:

- The legacy bridge is no longer supported. Stay on the published legacy release
  if your app cannot use React Native 0.82+ and the New Architecture.
- Events use Codegen's typed emitter internally instead of `NativeEventEmitter`.
  Consume them through the `start()` callback, not the old `HeadingUpdated` event.
- Magnetic-mode startup no longer prompts for location permission. The optional
  true-north mode does request foreground location access.
- Missing sensors and invalid update rates reject explicitly; failed starts
  remove their subscriptions.
- Android now emits the first valid reading and compares the shortest angular
  change across north, so `359` to `1` is a two-degree change.
- Both platforms now apply the same explicit degree filter after screen
  rotation. iOS no longer delegates this threshold to Core Location or bypasses
  it on orientation changes. Rate `0` also forwards identical Android readings.
- iOS landscape headings are normalized so they cannot become negative.
- Generated JavaScript and declarations are built into `lib/` rather than
  committed to the repository.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
