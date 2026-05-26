# react-native-liftoff

A lightweight boot-time performance measurement library for React Native. Record named checkpoints from native code and JavaScript, compute durations between them, and inspect the full boot timeline in the dev menu.

Supports **New Architecture** (TurboModules / JSI) and **Old Architecture** (bridge) with the same JavaScript API.

---

## Installation

```sh
npm install react-native-liftoff
```

### iOS

```sh
cd ios && pod install
```

### Android

No additional steps — the module is autolinked.

---

## Architecture Compatibility

| Architecture | iOS | Android |
|---|---|---|
| New Arch (TurboModules) | `RCT_NEW_ARCH_ENABLED=1` | `newarch` source set |
| Old Arch (Bridge) | default | `oldarch` source set |

The JavaScript API is **identical** for both architectures. The native module resolves automatically:

```ts
// src/NativeLiftoff.ts
export default (TurboModuleRegistry.get<Spec>('Liftoff') ??
  NativeModules.Liftoff) as Spec;
```

New Arch uses synchronous JSI calls. Old Arch uses `isBlockingSynchronousMethod` on the bridge — `mark()`, `getCheckpoints()`, and `getAnchor()` are all synchronous on both paths.

---

## JavaScript API

### `mark(name: string): number`

Records a named checkpoint at the current monotonic time. Returns the timestamp in milliseconds.

Call `mark` as early as possible — at module evaluation time (outside any function) to capture the moment the JS bundle reaches that line.

```ts
import { mark } from 'react-native-liftoff';

// At the top of your entry file, before any other work
mark('js:bundle:start');

// In a component file, at module scope
mark('js:homeScreen:loaded');

// Inside a lifecycle hook
useEffect(() => {
  mark('js:homeScreen:mounted');
}, []);
```

---

### `measure(name: string, fromMark: string, toMark: string): Measurement`

Computes the duration between two previously recorded marks. Stores the result in an internal list returned by `getReport()`.

Throws if either mark name is not found.

```ts
import { measure } from 'react-native-liftoff';

// Compute time from native init to JS bundle start
const m = measure('boot:native-to-js', 'app:didFinishLaunching:start', 'js:bundle:start');
console.log(m.durationMs); // e.g. 312.45

// Compute React tree hydration time
measure('boot:react-tree', 'js:appComponent:render', 'js:appComponent:mounted');
```

**Returns** a `Measurement` object:

```ts
type Measurement = {
  name: string;       // the label you passed as first argument
  from: string;       // fromMark name
  to: string;         // toMark name
  durationMs: number; // to.timestamp - from.timestamp (can be negative if order is wrong)
};
```

---

### `getReport(): Report`

Returns a snapshot of all recorded checkpoints and all measurements computed so far.

```ts
import { getReport } from 'react-native-liftoff';

const report = getReport();

// Print all checkpoints
report.checkpoints.forEach(cp => {
  console.log(`${cp.name}  @${cp.timestamp.toFixed(2)}ms  (${cp.wallTimeIso})`);
});

// Print all measurements
report.measurements.forEach(m => {
  console.log(`${m.name}: ${m.durationMs.toFixed(2)}ms  (${m.from} → ${m.to})`);
});
```

**Returns** a `Report` object:

```ts
type Report = {
  checkpoints: Checkpoint[];
  measurements: Measurement[];
};
```

---

### `clear(): void`

Clears all recorded checkpoints and measurements. The wall-time anchor is preserved — it is valid for the lifetime of the process.

Useful for resetting state between test scenarios or when you want a fresh report on a particular user flow.

```ts
import { clear } from 'react-native-liftoff';

// Reset before measuring a specific user action
clear();
mark('flow:checkout:start');
// ... user completes checkout ...
mark('flow:checkout:done');
const result = measure('checkout:total', 'flow:checkout:start', 'flow:checkout:done');
```

---

### `createPageScope(pageName: string): PageScope`

Creates a scoped helper that namespaces all marks and measurements under `page:<pageName>:`. Useful for isolating per-screen timing without polluting the global namespace.

```ts
import { createPageScope } from 'react-native-liftoff';

// Create a scope at module level (outside the component)
const scope = createPageScope('ProductDetail');

export default function ProductDetailScreen() {
  useEffect(() => {
    scope.mark('mounted');   // records "page:ProductDetail:mounted"
    scope.markTTI();         // records "page:ProductDetail:tti"
  }, []);

  // ...
}
```

**`PageScope` interface:**

```ts
interface PageScope {
  mark(name: string): number;
  markTTI(): number;
  measure(name: string, from: string, to: string): Measurement;
  getReport(): Report;
}
```

#### `scope.mark(name)`

Records `page:<pageName>:<name>`. Returns the timestamp.

```ts
scope.mark('data-loaded'); // → "page:ProductDetail:data-loaded"
```

#### `scope.markTTI()`

Shorthand for `scope.mark('tti')`. Records the Time-To-Interactive for the page.

```ts
scope.markTTI(); // → "page:ProductDetail:tti"
```

#### `scope.measure(name, from, to)`

Like global `measure()` but all three names are automatically prefixed with `page:<pageName>:`.

```ts
scope.measure('render-to-tti', 'mounted', 'tti');
// measures from "page:ProductDetail:mounted" to "page:ProductDetail:tti"
```

#### `scope.getReport()`

Returns a filtered `Report` containing only the checkpoints and measurements belonging to this page scope.

```ts
const pageReport = scope.getReport();
pageReport.checkpoints.forEach(cp => console.log(cp.name, cp.durationMs));
```

---

## Types

```ts
type Checkpoint = {
  name: string;
  timestamp: number;    // monotonic ms — use for computing durations
  wallTime: number;     // unix epoch ms — use for display only
  wallTimeIso: string;  // ISO 8601, e.g. "2024-11-14T21:30:01.221Z"
};

type Measurement = {
  name: string;
  from: string;
  to: string;
  durationMs: number;
};

type Report = {
  checkpoints: Checkpoint[];
  measurements: Measurement[];
};

interface PageScope {
  mark(name: string): number;
  markTTI(): number;
  measure(name: string, from: string, to: string): Measurement;
  getReport(): Report;
}
```

### Timestamp fields

Each `Checkpoint` has three time representations:

| Field | Type | Source | Use for |
|---|---|---|---|
| `timestamp` | `number` | Monotonic ms (`mach_absolute_time` on iOS, `SystemClock.elapsedRealtime()` on Android) | Computing durations — immune to NTP and clock changes |
| `wallTime` | `number` | Unix epoch ms, derived from monotonic via a one-time anchor | Display only — do not subtract two `wallTime` values across devices |
| `wallTimeIso` | `string` | `wallTime` as ISO 8601 | Logging, display |

---

## Native Boot Marks

To measure native startup phases you must call `LiftoffCollector.mark()` directly from native code. These marks share the same monotonic clock as JS-side marks, so you can measure across the native/JS boundary.

### iOS — New Architecture (Swift AppDelegate)

```swift
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    LiftoffCollector.mark("app:didFinishLaunching:start")

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory
    window = UIWindow(frame: UIScreen.main.bounds)

    LiftoffCollector.mark("rn:factory:willStart")
    factory.startReactNative(
      withModuleName: "MyApp",
      in: window,
      launchOptions: launchOptions
    )
    LiftoffCollector.mark("app:didFinishLaunching:end")

    return true
  }
}
```

### iOS — Old Architecture (Swift AppDelegate)

```swift
import UIKit
import React
import React_RCTAppDelegate

@main
class AppDelegate: RCTAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    LiftoffCollector.mark("app:didFinishLaunching:start")

    self.moduleName = "MyApp"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]

    LiftoffCollector.mark("rn:factory:willStart")
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    LiftoffCollector.mark("app:didFinishLaunching:end")

    return result
  }

  override func bundleURL() -> URL? {
    #if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}
```

### Android — New Architecture (Kotlin MainApplication)

```kotlin
package com.myapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.liftoff.LiftoffCollector

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages,
    )
  }

  override fun onCreate() {
    LiftoffCollector.mark("app:onCreate:start")
    super.onCreate()
    LiftoffCollector.mark("rn:host:willInit")
    loadReactNative(this)
    LiftoffCollector.mark("rn:host:didInit")
    LiftoffCollector.mark("app:onCreate:end")
  }
}
```

### Android — Old Architecture (Kotlin MainApplication)

```kotlin
package com.myapp

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.liftoff.LiftoffCollector

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : DefaultReactNativeHost(this) {
      override fun getPackages() = PackageList(this).packages
      override fun getJSMainModuleName() = "index"
      override fun getUseDeveloperSupport() = BuildConfig.DEBUG
      override val isNewArchEnabled = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    LiftoffCollector.mark("app:onCreate:start")
    super.onCreate()
    LiftoffCollector.mark("rn:factory:willStart")
    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) load()
    LiftoffCollector.mark("app:onCreate:end")
  }
}
```

---

## Canonical Boot Mark Names

These are the mark names used by the example apps and recognized in the JS measurement helpers. You are free to use any names you like, but these form a conventional vocabulary:

| Mark | Platform | When it fires |
|---|---|---|
| `app:didFinishLaunching:start` | iOS | Top of `application(_:didFinishLaunchingWithOptions:)` |
| `rn:factory:willStart` | iOS | Just before `factory.startReactNative(...)` |
| `app:didFinishLaunching:end` | iOS | After RN factory returns |
| `app:onCreate:start` | Android | Top of `Application.onCreate()` |
| `rn:host:willInit` | Android (new arch) | Just before `loadReactNative(this)` |
| `rn:host:didInit` | Android (new arch) | After `loadReactNative(this)` |
| `rn:factory:willStart` | Android (old arch) | Just before `SoLoader.init` |
| `app:onCreate:end` | Android | Bottom of `Application.onCreate()` |
| `js:appComponent:render` | JS | Module scope of your root `App.tsx` (fires on first render) |
| `js:appComponent:mounted` | JS | Inside `useEffect(() => {}, [])` in root `App.tsx` |
| `page:<Name>:tti` | JS | Recorded by `scope.markTTI()` |

---

## Full Boot Timing Example

This is the canonical pattern used in the example apps:

```tsx
// App.tsx
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { mark, measure, DevMenuReport } from 'react-native-liftoff';

// Fires the moment the JS module is evaluated
mark('js:appComponent:render');

export default function App() {
  useEffect(() => {
    // Fires after the first React tree commit
    mark('js:appComponent:mounted');

    // Measure native init phase
    if (Platform.OS === 'ios') {
      measure('boot:native-init', 'app:didFinishLaunching:start', 'app:didFinishLaunching:end');
      measure('boot:js-load', 'rn:factory:willStart', 'js:appComponent:render');
    } else {
      measure('boot:native-init', 'app:onCreate:start', 'app:onCreate:end');
      measure('boot:js-load', 'rn:host:willInit', 'js:appComponent:render');
    }

    // Measure React tree hydration
    measure('boot:react-tree', 'js:appComponent:render', 'js:appComponent:mounted');
  }, []);

  return (
    <>
      <YourApp />
      <DevMenuReport />
    </>
  );
}
```

```tsx
// HomeScreen.tsx
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { createPageScope, measure } from 'react-native-liftoff';

const scope = createPageScope('Home');

export default function HomeScreen() {
  useEffect(() => {
    scope.mark('mounted');
    scope.markTTI();

    // Total boot: from native start to first screen interactive
    const nativeStart = Platform.OS === 'ios'
      ? 'app:didFinishLaunching:start'
      : 'app:onCreate:start';
    measure('boot:total', nativeStart, 'page:Home:tti');
    measure('boot:js-to-tti', 'js:appComponent:mounted', 'page:Home:tti');
  }, []);

  // ...
}
```

---

## DevMenuReport

In **debug builds only**, liftoff registers a "Show Liftoff Report" item in the React Native developer menu.

Mount `<DevMenuReport />` once near the root of your app tree. It is a complete no-op in production (`__DEV__ === false`).

```tsx
import { DevMenuReport } from 'react-native-liftoff';

export default function App() {
  return (
    <>
      <YourApp />
      <DevMenuReport />
    </>
  );
}
```

**Opening the dev menu:**

| Platform | Action |
|---|---|
| iOS Simulator | Cmd+D |
| Android Emulator | Cmd+M (macOS) / Ctrl+M (Windows/Linux) |
| Physical device | Shake |

Select **"Show Liftoff Report"** to open the modal. It displays all checkpoints (with wall-clock time and delta from the first mark) and all measurements.

**Triggering programmatically** (useful for adding a debug button in your own UI):

```ts
import { DeviceEventEmitter } from 'react-native';

DeviceEventEmitter.emit('onShowReport');
```

**Optional: Copy as JSON**

Install `@react-native-clipboard/clipboard` to enable the "Copy as JSON" button in the modal. The library detects it at runtime — if absent, the button is simply hidden and nothing crashes.

```sh
npm install @react-native-clipboard/clipboard
```

---

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
