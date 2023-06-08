import { View, Text, StyleSheet } from 'react-native';
import React, { useState } from 'react';
import CompassHeading from 'react-native-compass-heading';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const App = () => {
  const [heading, setHeading] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  React.useEffect(() => {
    const degree_update_rate = 3;

    CompassHeading.start(degree_update_rate, (data) => {
      setHeading(data.heading);
      setAccuracy(data.accuracy);
    });

    return () => {
      CompassHeading.stop();
    };
  }, []);
  return (
    <View style={styles.container}>
      <Text>{'heading: ' + heading}</Text>
      <Text>{'accuracy: ' + accuracy}</Text>
    </View>
  );
};

export default App;
