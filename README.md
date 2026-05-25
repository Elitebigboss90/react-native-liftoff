# react-native-liftoff

A library to measure boot up time in the different stage for a react native app.

## Installation

```sh
npm install react-native-liftoff
```

## Usage

```ts
import { mark, measure, getReport, createPageScope } from 'react-native-liftoff';

// Record a checkpoint
mark('app:js-start');

// Compute time between two marks
const result = measure('boot', 'app:native-start', 'app:js-start');
console.log(result.durationMs);

// Page-scoped timing
const home = createPageScope('Home');
home.mark('render');
home.markTTI();
console.log(home.getReport());
```

## Dev Menu

In **debug builds only**, liftoff registers a "Show Liftoff Report" item in the React Native developer menu.

**Trigger the dev menu:**
- iOS Simulator: Cmd+D
- Android Emulator: Cmd+M (macOS) / Ctrl+M (Windows/Linux)
- Physical device: shake

**Display the report:**
Mount `<DevMenuReport />` once near the root of your app tree. It listens for the dev menu event and renders an in-app modal showing all recorded checkpoints and measurements. It is a complete no-op in production (`__DEV__ === false`).

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

**Optional: Copy as JSON**
Install `@react-native-clipboard/clipboard` to enable the "Copy as JSON" button in the modal. Without it the button is hidden — the library never crashes if the dependency is absent.

**Production builds:**
The component, event listener, and native dev menu registration are all stripped from release builds. No code runs in production.

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
