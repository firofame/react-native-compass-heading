import React from 'react';

import { View, Text } from 'react-native';
import CompassHeading from 'react-native-compass-heading';

const App = () => {
  React.useEffect(() => {
    const degree_update_rate = 3;

    const unsubscribe = CompassHeading.start(
      degree_update_rate,
      ({ heading, accuracy }) => {
        console.log('CompassHeading update:', heading, accuracy);
      }
    );

    return () => {
      console.log('unsubscribe');
      unsubscribe(); // Stop the compass updates when the component unmounts
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Compass Heading Test</Text>
    </View>
  );
};

export default App;
