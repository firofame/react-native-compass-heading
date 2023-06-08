# react-native-compass-heading

React Native module for iOS & Android to receive compass heading

## Installation

```sh
npm install react-native-compass-heading
```

## Usage

```js
import CompassHeading from 'react-native-compass-heading';

  React.useEffect(() => {
    const degree_update_rate = 3;

    CompassHeading.start(degree_update_rate, ({heading, accuracy}) => {
      console.log('CompassHeading: ', heading, accuracy);
    });

    return () => {
      CompassHeading.stop();
    };
  }, []);
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
