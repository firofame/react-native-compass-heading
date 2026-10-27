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

No location permission is requested: this library reads **magnetic heading**, not
the device's location or true north.

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

- `start(degreeUpdateRate, callback): Promise<boolean>` starts updates and resolves
  to `true` when the native start request succeeds, not when the first reading
  arrives. `degreeUpdateRate` is a finite, non-negative angular change in
  **degrees**, not a time interval. Pass `0` (or `null`, for compatibility) for
  unfiltered updates. See the filtering rules below.
- `stop(): Promise<void>` removes the JavaScript subscription immediately and
  requests that native sensors stop. Calling it more than once is safe. On iOS,
  native cleanup is queued on the main thread; the promise does not wait for
  that cleanup. `start()` does not return an unsubscribe function; use `stop()`
  in your cleanup.
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
north**, normalized to `[0, 360)`: north is `0`, east `90`, south `180`, and west
`270`. It is not true-north heading and no magnetic declination correction is
applied.

### Filtering rules (both platforms)

- The first valid reading after each start is emitted regardless of the rate.
- For a positive rate, subsequent readings are emitted only when the shortest
  angular distance from the **last emitted** heading is **strictly greater**
  than the rate. A change equal to the rate is suppressed; smaller changes
  accumulate relative to the last emitted heading, not the last sensor sample.
- The comparison happens after screen-orientation adjustment and before any
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
  callback rejects with `TypeError`. Native code also validates the rate.
- Missing heading hardware rejects `start()` with native code `not_available`
  on either platform. Android sensor-listener registration failure rejects with
  `failed_start`. A failed start removes its JavaScript subscription.
- On iOS, Core Location can report failures **after** `start()` has resolved.
  These are logged natively, not delivered to the heading callback or used to
  reject an already-resolved promise. A successful start is not a guarantee of
  future readings. There is no JavaScript runtime-error callback.

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
- iOS compass startup no longer prompts for location permission.
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
