import type { TurboModule, CodegenTypes } from 'react-native';
import { TurboModuleRegistry, NativeModules } from 'react-native';

export interface Spec extends TurboModule {
  mark(name: string): number;
  getCheckpoints(): Array<{ name: string; timestamp: number }>;
  clear(): void;
  getAnchor(): { monotonicMs: number; wallMs: number };
  readonly onShowReport: CodegenTypes.EventEmitter<void>;
}

// New arch resolves via TurboModuleRegistry; old arch falls back to NativeModules bridge.
export default (TurboModuleRegistry.get<Spec>('Liftoff') ??
  NativeModules['Liftoff']) as Spec;
