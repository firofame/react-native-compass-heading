import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export type HeadingData = {
  heading: number;
  accuracy: number;
};

export type HeadingError = {
  code: string;
  message: string;
};

export interface Spec extends TurboModule {
  start(degreeUpdateRate: number, useTrueNorth: boolean): Promise<boolean>;
  stop(): void;
  hasCompass(): Promise<boolean>;
  readonly onHeadingUpdated: CodegenTypes.EventEmitter<HeadingData>;
  readonly onError: CodegenTypes.EventEmitter<HeadingError>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CompassHeading');
