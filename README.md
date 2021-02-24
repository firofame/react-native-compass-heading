# react-native-compass-heading

<img src="android.png" width="40%"> <img src="ios.png" width="40%">

credits - https://github.com/vnil/react-native-simple-compass

## Installation

`$ yarn add react-native-compass-heading`

`$ cd ios/ && pod install && cd ..`

## Usage
```javascript
import React, {useState, useEffect} from 'react';
import {Image, StyleSheet} from 'react-native';
import CompassHeading from 'react-native-compass-heading';

const App = () => {
  const [compassHeading, setCompassHeading] = useState(0);

  useEffect(() => {
    const degree_update_rate = 3;

    // accuracy on android will be hardcoded to 1
    // since the value is not available.
    // For iOS, it is in degrees
    CompassHeading.start(degree_update_rate, {heading, accuracy} => {
      setCompassHeading(heading);
    });

    return () => {
      CompassHeading.stop();
    };
  }, []);

  return (
    <Image
      style={[
        styles.image,
        {transform: [{rotate: `${360 - compassHeading}deg`}]},
      ]}
      resizeMode="contain"
      source={require('./compass.png')}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: '90%',
    flex: 1,
    alignSelf: 'center',
  },
});

export default App;
```
