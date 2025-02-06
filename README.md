# react-native-compass-heading

React Native module for iOS & Android to receive compass heading

## Installation

```sh
yarn add react-native-compass-heading
```

## Usage


```js
import { View, Text } from 'react-native';
import React, { useEffect, useState } from 'react';
import CompassHeading from 'react-native-compass-heading';

export default function App() {
  const [headingValue, setHeadingValue] = useState(0);
  useEffect(() => {
    const degree_update_rate = 3;

      CompassHeading.start(degree_update_rate, ({heading, accuracy}) => {
        setHeadingValue(heading);
      });

    return () => {
      CompassHeading.stop();
    };
  }, []);
  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white'}}>
      <Text>{headingValue}</Text>
    </View>
  );
}
```


## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
