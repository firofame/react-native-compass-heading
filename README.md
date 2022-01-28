# react-native-compass-heading

<img src="android.png" width="40%"> <img src="ios.png" width="40%">

credits - https://github.com/vnil/react-native-simple-compass

## Installation

`$ yarn add react-native-compass-heading`

`$ npx pod-install`

## Usage
```javascript
import CompassHeading from 'react-native-compass-heading';

  useEffect(() => {
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
