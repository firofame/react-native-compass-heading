# react-native-compass-heading

## Installation

`$ yarn add react-native-compass-heading`

`$ cd ios/ && pod install && cd ..`

## Usage
```javascript
import CompassHeading from 'react-native-compass-heading';

useEffect(() => {
    const degree_update_rate = 3;
    
    CompassHeading.start(degree_update_rate, degree => {
      setCompassHeading(degree);
    });
    
    return () => {
      CompassHeading.stop();
    };
}, []);
```
