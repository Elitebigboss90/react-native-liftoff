# react-native-liftoff — Example App

This app is the reference integration of `react-native-liftoff`. It was built to answer a specific question: **how long does it take for the app to become usable, and where does that time actually go?**

If you are a developer tasked with integrating `react-native-liftoff` into a large production app, this document walks through every decision made here — what was instrumented, where the code lives, what each number means, and how to apply the same approach to your codebase.

---

## Table of contents

1. [Why boot-time instrumentation is hard](#1-why-boot-time-instrumentation-is-hard)
2. [How liftoff solves it](#2-how-liftoff-solves-it)
3. [The timing model](#3-the-timing-model)
4. [How the data gets from native to JS](#4-how-the-data-gets-from-native-to-js)
5. [Running the example app](#5-running-the-example-app)
6. [Integration walkthrough — file by file](#6-integration-walkthrough--file-by-file)
7. [Every checkpoint explained](#7-every-checkpoint-explained)
8. [Every measurement explained](#8-every-measurement-explained)
9. [How to read the Dev Menu Report](#9-how-to-read-the-dev-menu-report)
10. [Instrumenting screens with page scopes](#10-instrumenting-screens-with-page-scopes)
11. [Applying this to a large production app](#11-applying-this-to-a-large-production-app)
12. [What good numbers look like](#12-what-good-numbers-look-like)

---

## 1. Why boot-time instrumentation is hard

React Native apps have a split launch timeline:

```
[OS launches process]
       ↓
[Native AppDelegate / Application runs]        ← pure native, no JS yet
       ↓
[RN runtime initialises, JS bundle loads]      ← bridge/TurboModule setup
       ↓
[JS engine evaluates your bundle]              ← module graph executes
       ↓
[React renders the component tree]             ← reconciliation + commit
       ↓
[First screen becomes interactive]             ← TTI
```

The problem is that JavaScript only exists from step 3 onward. By the time you can run `Date.now()` in your app code, you have already missed everything that happened in the native layers. `performance.now()` has the same limitation — the JS performance timeline starts when the runtime is ready, not when the user tapped the app icon.

A second problem is that `Date.now()` is a wall clock. It is affected by NTP syncs and device clock corrections. If you subtract two `Date.now()` values you took 800 ms apart and a clock sync happened in between, you will get a wrong number.

---

## 2. How liftoff solves it

`react-native-liftoff` runs a native collector (`LiftoffCollector`) that starts the moment the class is first used — on iOS this is `+initialize`, guaranteed to run before any application code. On Android it is the Kotlin `object` initializer, which runs when the class is loaded.

The collector uses **monotonic clocks**:
- iOS: `mach_absolute_time()` — immune to NTP, never goes backward
- Android: `SystemClock.elapsedRealtime()` — same guarantee

You call `[LiftoffCollector mark:@"some:event"]` (ObjC) or `LiftoffCollector.mark("some:event")` (Kotlin) at any point in the native lifecycle, including before React Native has initialised. Those timestamps are stored in a thread-safe array in native memory.

Later, when JS is running, `NativeLiftoff.getCheckpoints()` pulls all of those timestamps into JS. Your JS code can then call `mark('js:event')` for JS-side events — those also go through the native collector so they share the same clock.

The result is a **unified timeline** spanning the entire app lifecycle with no gaps.

---

## 3. The timing model

### Monotonic timestamps

Every checkpoint has a `timestamp` field. This is raw monotonic milliseconds from the collector's clock. The values are large numbers (e.g. `2381073003.87`) — they represent time since device boot, not time since your app launched.

**Use `timestamp` for all duration math.** Never subtract `wallTime` values.

### Wall-clock anchor

When the collector first initialises it records an anchor pair:

```
anchorMonotonicMs  — monotonic time at init
anchorWallMs       — wall time (Unix epoch ms) at init
```

In JS, `getAnchor()` fetches this pair once and caches it for the process lifetime. Every checkpoint then gets two derived fields computed in JS:

```
wallTime    = anchorWallMs + (checkpoint.timestamp - anchorMonotonicMs)
wallTimeIso = new Date(wallTime).toISOString()
```

This converts any monotonic timestamp to a human-readable wall time without ever taking a second wall-clock sample. The math is exact because the offset between the two clocks is fixed at anchor time.

**`wallTime` is for display only.** Do not subtract `wallTime` from another `wallTime` — use `timestamp` differences instead.

### Why the anchor is cached and never reset

`clear()` clears all checkpoints and measurements but deliberately does **not** reset the anchor. The anchor represents the relationship between the monotonic clock and wall time for this process. That relationship is a physical constant for the session — resetting it would break the wall-time math for any checkpoints recorded after a `clear()`.

---

## 4. How the data gets from native to JS

```
LiftoffCollector (native)
  └─ mark(), checkpoints(), anchorMonotonicMs, anchorWallMs

Liftoff.mm / LiftoffModule.kt  (TurboModule bridge)
  └─ exposes mark(), getCheckpoints(), clear(), getAnchor()

NativeLiftoff.ts  (codegen spec)
  └─ typed interface consumed by core.ts

core.ts  (JS)
  └─ mark(), measure(), getReport(), clear()
     - getReport() calls getCheckpoints() and decorates each with wallTime/wallTimeIso
     - getAnchor() is called lazily on first getReport(), then cached
```

All JS `mark()` calls also go through the TurboModule to the native collector, so JS and native timestamps share the same clock.

---

## 5. Running the example app

```sh
# From the monorepo root
yarn install

# iOS — install pods first
cd example/ios && bundle exec pod install && cd ../..
yarn ios

# Android
yarn android
```

To see the full report at any time, either:
- Open the **dev menu** (`Cmd+D` on iOS Simulator, `Cmd+M` on Android Emulator, or shake a physical device) and tap **"Show Liftoff Report"**
- Tap the **"Show Boot Report"** button on the Home screen (debug builds only)

---

## 6. Integration walkthrough — file by file

### `ios/AppDelegate.swift` — native boot marks (iOS)

This is the single most important integration point. The native delegate runs before the JS bundle exists, so any marks placed here capture time that is otherwise invisible to the app.

```swift
func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
) -> Bool {
    LiftoffCollector.mark("app:didFinishLaunching:start")   // ← first line
    // ... rest of AppDelegate work ...
    LiftoffCollector.mark("rn:factory:willStart")
    factory.startReactNative(...)
    LiftoffCollector.mark("app:didFinishLaunching:end")     // ← last line
    return true
}
```

**Why three marks instead of one?** The start and end marks bracket the entire `didFinishLaunching` method. The `willStart` mark is placed immediately before the call that boots the RN runtime — this lets you separate "our AppDelegate setup code" from "the RN runtime itself starting up".

### `android/app/src/main/java/.../MainApplication.kt` — native boot marks (Android)

```kotlin
override fun onCreate() {
    LiftoffCollector.mark("app:onCreate:start")
    super.onCreate()
    LiftoffCollector.mark("rn:host:willInit")
    loadReactNative(this)
    LiftoffCollector.mark("rn:host:didInit")
    LiftoffCollector.mark("app:onCreate:end")
}
```

Same principle: `onCreate` on Android is the equivalent of `didFinishLaunching` on iOS.

### `src/App.tsx` — JS module-level and component-level marks

```ts
mark('js:appComponent:render');   // ← module scope, runs when file is evaluated
```

This line is placed **outside any function**, at the module level. In React Native, modules are evaluated the first time they are imported. `App.tsx` is the root of your component tree, so it is evaluated early in the JS execution phase — this is the earliest JS mark you can reliably take.

```ts
useEffect(() => {
    mark('js:appComponent:mounted');
    measure('boot:native-init', 'app:didFinishLaunching:start', 'app:didFinishLaunching:end');
    measure('boot:js-load', 'rn:factory:willStart', 'js:appComponent:render');
    measure('boot:react-tree', 'js:appComponent:render', 'js:appComponent:mounted');
}, []);
```

The `useEffect` with an empty dependency array runs **once**, after the initial render commits to screen. At this point all three marks (`rn:factory:willStart`, `js:appComponent:render`, `js:appComponent:mounted`) are recorded, so it is safe to compute the first three measurements. `boot:total` cannot be computed here because `page:Home:tti` does not exist yet — that happens in HomeScreen.

### `src/screens/HomeScreen.tsx` — final boot measurements

```ts
useEffect(() => {
    scope.mark('mounted');
    scope.markTTI();
    measure('boot:total', 'app:didFinishLaunching:start', 'page:Home:tti');
    measure('boot:js-to-tti', 'js:appComponent:mounted', 'page:Home:tti');
}, []);
```

After `scope.markTTI()`, the `page:Home:tti` checkpoint exists. Now it is safe to compute the two remaining measurements. `boot:total` is the headline number — the full cold-start duration from the very first native lifecycle method to the home screen being interactive.

---

## 7. Every checkpoint explained

### iOS boot sequence

| Checkpoint | Description |
|---|---|
| `app:didFinishLaunching:start` | The very first line of `application(_:didFinishLaunchingWithOptions:)`. This is the earliest moment in your app's lifecycle after the OS has loaded your binary, started the process, and called into your code. |
| `rn:factory:willStart` | Immediately before `RCTReactNativeFactory.startReactNative()` is called. This is the point where control transfers to the React Native runtime. Everything between `start` and this mark is your own AppDelegate setup (SDK inits, crash reporters, etc.). |
| `app:didFinishLaunching:end` | The last line before `return true`. By this point the RN runtime has been told to start but the JS bundle has not yet loaded — the method returns and the OS proceeds with drawing the initial window. |

### Android boot sequence

| Checkpoint | Description |
|---|---|
| `app:onCreate:start` | First line of `Application.onCreate()`. Equivalent to iOS's `didFinishLaunching:start`. |
| `rn:host:willInit` | Before `loadReactNative(this)`. Equivalent to `rn:factory:willStart`. |
| `rn:host:didInit` | After `loadReactNative(this)` returns. On Android, the RN host init is synchronous from Application's perspective, so this marks when the host object is configured (the JS bundle still loads asynchronously after this). |
| `app:onCreate:end` | Last line of `onCreate()`. |

### JS checkpoints

| Checkpoint | Description |
|---|---|
| `js:appComponent:render` | Placed at module scope in `App.tsx`. Fires when the JS engine evaluates the module — this is after the bundle has been parsed and the module graph has been resolved. It is the first moment your application logic runs. |
| `js:appComponent:mounted` | Placed in `useEffect(() => {}, [])` in the root `App` component. Fires after React's first commit — the component tree has been rendered and applied to the native view layer. |

### Page checkpoints — Home screen

| Checkpoint | Description |
|---|---|
| `page:Home:mounted` | `useEffect` in HomeScreen — React has committed the Home screen component. |
| `page:Home:tti` | Set via `scope.markTTI()` in the same effect. For Home, mounted and TTI coincide because the screen renders from in-memory data with no async loading. |

### Page checkpoints — HeavyList screen

| Checkpoint | Description |
|---|---|
| `page:HeavyList:mounted` | The screen component has committed. The list has not rendered yet. |
| `page:HeavyList:firstItemRendered` | The first item in the 1,000-item list has committed. This is when content becomes visible. Measured via a `useEffect` inside `ListItem` for `item.id === 0`. |
| `page:HeavyList:tti` | Fires from FlashList's `onLoad` callback — the list has calculated layout for the visible window and all visible items are painted. This is the most accurate TTI for a virtualized list. |

### Page checkpoints — Animated screen

| Checkpoint | Description |
|---|---|
| `page:Animated:mounted` | The screen component has committed to the native layer. |
| `page:Animated:firstFrame` | The first animated frame has fired. Captured via `runOnJS(markFirstFrame)()` inside `useAnimatedStyle` — the worklet runs on the UI thread and bridges the result to JS exactly once. This marks when the Reanimated render pipeline has produced its first output. |
| `page:Animated:tti` | Set in `useEffect` immediately after starting the animation. For this screen, TTI is declared once the animation loop is running — the interaction (dragging the card) is available from that point. |

### Page checkpoints — Storage screen

| Checkpoint | Description |
|---|---|
| `page:Storage:mmkv:start` | Immediately before the synchronous MMKV write+read. |
| `page:Storage:mmkv:done` | Immediately after the synchronous MMKV read returns. Because MMKV is synchronous, the delta between these two is the pure storage round-trip cost with no async overhead. |
| `page:Storage:asyncStorage:start` | Immediately before `AsyncStorage.setItem()` is called. |
| `page:Storage:asyncStorage:done` | Inside the `.then()` callback, after `getItem` resolves. This captures the full async round-trip including the native bridge call, file I/O, and promise resolution. |
| `page:Storage:tti` | Set alongside `asyncStorage:done` — the screen is considered interactive once the async operation completes and both values are displayed. |

### Page checkpoints — Form screen

| Checkpoint | Description |
|---|---|
| `page:Form:mounted` | The form fields have committed to screen. |
| `page:Form:tti` | Set on the first `onFocus` event on any input field. This is an interaction-driven TTI: the screen is not considered interactive until the user has actually engaged with it. A ref guard ensures this fires only once. |

---

## 8. Every measurement explained

Measurements are computed by calling `measure(name, fromMark, toMark)`. The result is `{ name, from, to, durationMs }`. All durations are in milliseconds.

### Boot measurements

| Measurement | From → To | What it tells you |
|---|---|---|
| `boot:native-init` | `app:didFinishLaunching:start` → `app:didFinishLaunching:end` | **Total native startup cost.** Everything your AppDelegate does: SDK inits, analytics setup, crash reporter registration, feature flag prefetch, etc. If this number is large, your native init code is slow. |
| `boot:js-load` | `rn:factory:willStart` → `js:appComponent:render` | **JS bundle parse and evaluate time.** Covers the RN runtime startup, the Metro/Hermes bundle parse, and the execution of all top-level module code across your entire bundle. This is dominated by bundle size and Hermes startup overhead. |
| `boot:react-tree` | `js:appComponent:render` → `js:appComponent:mounted` | **React's first render and commit.** The time React takes to reconcile your initial component tree, call all render functions top-to-bottom, and apply the result to the native view layer for the first time. |
| `boot:js-to-tti` | `js:appComponent:mounted` → `page:Home:tti` | **Navigation setup and Home screen render.** After App mounts, React Navigation initialises its state, the navigator renders, and HomeScreen mounts. This is the cost of your navigation library, your root providers, and the initial screen's rendering. |
| `boot:total` | `app:didFinishLaunching:start` → `page:Home:tti` | **End-to-end cold start.** The headline metric. This is what the user experiences as "launch time" — from tapping the icon to the home screen being ready to use. |

### Relationship between measurements

```
app:didFinishLaunching:start
├── [boot:native-init]
app:didFinishLaunching:end

rn:factory:willStart
├── [boot:js-load]
js:appComponent:render
├── [boot:react-tree]
js:appComponent:mounted
├── [boot:js-to-tti]
page:Home:tti
│
└── [boot:total spans the entire diagram above]
```

Note that `boot:native-init` ends before `rn:factory:willStart` — there is an unmeasured gap between `didFinishLaunching:end` and `rn:factory:willStart` (the time between the method returning and the RN runtime starting up). Similarly, `rn:factory:willStart` and `didFinishLaunching:end` overlap: the factory call is inside the method. These are design decisions about which spans are most actionable, not gaps in coverage.

---

## 9. How to read the Dev Menu Report

Open the report via **dev menu → "Show Liftoff Report"** or the **"Show Boot Report"** button.

### Checkpoints section

Each row shows:
```
HH:MM:SS.mmm  +Δms  checkpoint:name
```

- **`HH:MM:SS.mmm`** — local wall time when the checkpoint was recorded. Useful for correlating with device logs or Xcode Instruments.
- **`+Δms`** — milliseconds since the first checkpoint in the list. This is computed from `timestamp` differences (monotonic), so it is accurate even if a clock sync happened during the session.
- **`checkpoint:name`** — the mark name.

Reading the list top-to-bottom gives you the exact sequence of events in chronological order. A large `+Δms` jump between two adjacent rows means that interval is where time is being spent.

### Measurements section

Each row shows:
```
measurement:name  from:mark → to:mark  (X.XX ms)
```

The measurements are pre-computed spans. The duration is always `to.timestamp - from.timestamp` — monotonic, immune to clock drift.

### Copy as JSON

If `@react-native-clipboard/clipboard` is installed (it is, in this example app), the **"Copy as JSON"** button copies the full report to the clipboard. Paste it into any JSON viewer. The structure is:

```json
{
  "checkpoints": [
    {
      "name": "app:didFinishLaunching:start",
      "timestamp": 2381073003.87,
      "wallTime": 1779752920049.67,
      "wallTimeIso": "2026-05-25T23:48:40.049Z"
    }
  ],
  "measurements": [
    {
      "name": "boot:total",
      "from": "app:didFinishLaunching:start",
      "to": "page:Home:tti",
      "durationMs": 1183.65
    }
  ]
}
```

This JSON is the format you would send to an analytics backend, write to a file, or log to your error-reporting service.

---

## 10. Instrumenting screens with page scopes

Every screen in this app uses `createPageScope`. Here is what that does and why it matters.

```ts
const scope = createPageScope('HeavyList');
```

This creates an object with methods that automatically prefix every mark and measurement name with `page:HeavyList:`. It provides three benefits:

1. **Namespacing** — no collision between marks on different screens. Two screens can both have a `mounted` mark without conflict.
2. **Filtered reports** — `scope.getReport()` returns only checkpoints and measurements that belong to this page. Useful when you want to log a single screen's perf data in isolation.
3. **Readability** — when you look at the full report, marks are instantly attributable to their origin screen.

### The TTI contract

Every screen in this app calls `scope.markTTI()`. TTI (Time To Interactive) is the moment the screen becomes usable — it is the most important single metric for screen-level performance. How you define "interactive" is deliberate and screen-specific:

| Screen | TTI definition | Rationale |
|---|---|---|
| Home | Same as `mounted` | Renders from local data, no loading state |
| HeavyList | FlashList `onLoad` | Content is interactive only once the list has rendered its visible window |
| Animated | Immediately after animation starts | The draggable card is the interaction — it is ready once the loop is running |
| Storage | After async storage resolves | The screen displays loaded data; it would be misleading to declare TTI before the data appears |
| Form | On first `onFocus` | The screen is usable when the user can type — focus is the clearest signal |

In a production app, your TTI definition for each screen is a deliberate product decision. Agree on it with your team before you instrument, because it determines what your data means.

---

## 11. Applying this to a large production app

### Step 1: Add native marks as early as possible

**iOS** — In `AppDelegate.swift`, the very first line of `application(_:didFinishLaunchingWithOptions:)` should be a mark. If your AppDelegate does significant work (Firebase, Datadog, feature flags, A/B test SDK init), place marks around each of those blocks so you can see their individual cost.

```swift
LiftoffCollector.mark("app:didFinishLaunching:start")
LiftoffCollector.mark("sdk:firebase:start")
FirebaseApp.configure()
LiftoffCollector.mark("sdk:firebase:end")
LiftoffCollector.mark("sdk:featureFlags:start")
FeatureFlags.initialize()
LiftoffCollector.mark("sdk:featureFlags:end")
// ...
```

**Android** — Same pattern in `MainApplication.kt`.

### Step 2: Add JS marks at module scope

In your root file (the one registered with `AppRegistry.registerComponent`), place a module-level mark:

```ts
import { mark } from 'react-native-liftoff';
mark('js:root:evaluated');
```

This fires as soon as the module is evaluated — earlier than any `useEffect`.

### Step 3: Define measurements in a single file

In a large app, `measure()` calls scattered across many files become hard to audit. Consider a dedicated `boot-metrics.ts` file:

```ts
import { measure } from 'react-native-liftoff';

export function recordBootMetrics() {
  measure('boot:native-init', 'app:didFinishLaunching:start', 'app:didFinishLaunching:end');
  measure('boot:js-load', 'rn:factory:willStart', 'js:root:evaluated');
  measure('boot:react-tree', 'js:root:evaluated', 'js:appComponent:mounted');
  measure('boot:total', 'app:didFinishLaunching:start', 'page:Home:tti');
}
```

Call `recordBootMetrics()` once from the Home screen's mount effect, after TTI is marked. Having all measurement definitions in one place makes it easy to review, update, and extend without grep-ing the entire codebase.

### Step 4: Send data to your analytics backend

`getReport()` returns a plain JS object. Serialize it and send it wherever you collect performance data:

```ts
import { getReport } from 'react-native-liftoff';

const report = getReport();
analytics.track('app_boot', {
  boot_total_ms: report.measurements.find(m => m.name === 'boot:total')?.durationMs,
  boot_native_ms: report.measurements.find(m => m.name === 'boot:native-init')?.durationMs,
  boot_js_load_ms: report.measurements.find(m => m.name === 'boot:js-load')?.durationMs,
  // etc.
});
```

Send this on every cold start. Over time, track the p50, p90, and p99 across your user base. Regressions in a specific segment (e.g. `boot:js-load` p90 spikes on a release) tell you exactly where to look.

### Step 5: Add page-scope instrumentation to high-traffic screens

Not every screen needs instrumentation. Focus on the screens your users see most often and the screens your team most frequently changes. For each, define:

- `mounted` — when the component mounts
- `dataReady` — when async data (API calls, database reads) is available
- `tti` — when the user can meaningfully interact

Use `scope.measure('load', 'mounted', 'dataReady')` to quantify the async loading cost.

### Step 6: Guard against missing marks

`measure()` throws if either mark is not found. In production, wrap measurement calls defensively:

```ts
function safeMeasure(name: string, from: string, to: string) {
  try {
    return measure(name, from, to);
  } catch {
    // Mark may be missing if the screen was navigated to directly (deep link)
    // or if the app was restored from background rather than cold-started.
    return null;
  }
}
```

This is especially important for native marks (`app:didFinishLaunching:start`), which only exist on a true cold start. If the user backgrounds and restores the app, the JS layer is still running but the native marks from the previous launch may have been cleared.

### Step 7: Distinguish cold start from warm start

Call `clear()` when the app moves to background:

```ts
AppState.addEventListener('change', (state) => {
  if (state === 'background') clear();
});
```

On the next foreground, new marks will be recorded. This lets you track warm-start performance separately. Be aware that native marks (`didFinishLaunching`) will not be re-recorded on warm start — those only fire on process launch.

---

## 12. What good numbers look like

These are rough reference values for a mid-range device on a release build with Hermes enabled. Debug builds are significantly slower and should not be used for performance benchmarking.

| Measurement | Good | Investigate |
|---|---|---|
| `boot:native-init` | < 200 ms | > 500 ms — audit SDK init order; consider deferring non-critical SDKs |
| `boot:js-load` | < 300 ms | > 600 ms — check bundle size; enable Hermes bytecode; audit top-level side effects |
| `boot:react-tree` | < 100 ms | > 200 ms — check root provider count; look for expensive synchronous computations in render |
| `boot:js-to-tti` | < 200 ms | > 400 ms — check navigation library setup cost; look for expensive data fetching before render |
| `boot:total` | < 800 ms | > 1500 ms — users notice; file a perf incident |

**Debug vs release:** Debug builds run the JS bundle without Hermes pre-compilation and with all dev-mode checks enabled. `boot:js-load` in debug can be 5–10× slower than release. Always measure on release builds before drawing conclusions.

**Simulator vs device:** iOS Simulator uses your Mac's CPU, which is faster than any phone. Android Emulator is the opposite — it is usually slower. Always validate on physical mid-range hardware before reporting numbers to stakeholders.

**First launch vs subsequent launches:** On iOS, the OS pre-warms apps after a few launches. Subsequent cold starts may be faster due to dyld shared cache and prefetching. If you are measuring startup regressions, be consistent about whether you are measuring first-ever-install or steady-state cold starts.
