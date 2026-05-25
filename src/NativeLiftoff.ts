import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  mark(name: string): void;
  getCheckpoints(): Array<{ name: string; timestamp: number }>;
  clear(): void;
  getAnchor(): { monotonicMs: number; wallMs: number };
  // Required by NativeEventEmitter on the JS side:
  readonly addListener: (eventType: string) => void;
  readonly removeListeners: (count: number) => void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Liftoff');
