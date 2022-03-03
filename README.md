# react-native-compass-heading

React Native module for iOS & Android to receive compass heading

## Installation

`$ yarn add react-native-compass-heading`

`$ npx pod-install`

## Usage
```javascript
import CompassHeading from 'react-native-compass-heading';

  React.useEffect(() => {
    const degree_update_rate = 3;

    // accuracy on android will be hardcoded to 1
    // since the value is not available.
    // For iOS, it is in degrees
    CompassHeading.start(degree_update_rate, ({heading, accuracy}) => {
      console.log('CompassHeading: ', heading, accuracy);
    });

    return () => {
      CompassHeading.stop();
    };
  }, []);
```

# Acknowledgements

Thanks to the authors of react-native-simple-compass for inspiration
