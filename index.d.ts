declare module 'react-native-compass-heading' {
  interface CompassData {
    heading: number;
    accuracy: number;
  }

  type CompassCallback = (data: CompassData) => void;

  interface CompassHeading {
    start(degreeUpdateRate: number, callback: CompassCallback): void;
    stop(): void;
  }

  const CompassHeading: CompassHeading;

  export default CompassHeading;
}
