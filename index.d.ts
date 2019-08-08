declare module 'react-native-compass-heading' {
  export const start: (
    threshold: number,
    callback: (heading: number) => void,
  ) => Promise<boolean>;

  export const stop: () => void;
}
