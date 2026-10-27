import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import CompassHeading, { type HeadingData } from 'react-native-compass-heading';

export default function App() {
  const [reading, setReading] = useState<HeadingData>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    async function startCompass() {
      try {
        const available = await CompassHeading.hasCompass();
        if (!active) {
          return;
        }
        if (!available) {
          setError(
            'This device does not have a compass. Use a physical device.'
          );
          return;
        }
        await CompassHeading.start(3, (data) => {
          if (active) {
            setReading(data);
          }
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
    <View style={styles.container}>
      <Text style={styles.title}>Compass Heading</Text>
      {error ? (
        <Text accessibilityRole="alert">{error}</Text>
      ) : reading ? (
        <>
          <Text>Heading: {reading.heading.toFixed(0)} degrees</Text>
          <Text>Accuracy: {reading.accuracy}</Text>
        </>
      ) : (
        <Text>Waiting for a compass reading...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
  },
});
