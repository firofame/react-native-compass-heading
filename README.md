# react-native-compass-heading

React Native module for iOS & Android to receive compass heading

## Installation

```shell
$ yarn add react-native-compass-heading
$ npx pod-install
```

## Usage
```javascript
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

## Acknowledgements

Thanks to the authors of react-native-simple-compass for inspiration
