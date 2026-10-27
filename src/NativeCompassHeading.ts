import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

export type HeadingData = {
  heading: number;
  accuracy: number;
};

export interface Spec extends TurboModule {
  start(degreeUpdateRate: number): Promise<boolean>;
  stop(): void;
  hasCompass(): Promise<boolean>;
  readonly onHeadingUpdated: CodegenTypes.EventEmitter<HeadingData>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CompassHeading');
