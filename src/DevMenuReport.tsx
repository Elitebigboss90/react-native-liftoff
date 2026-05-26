import React, { useEffect, useState } from 'react';
import {
  DeviceEventEmitter,
  DevSettings,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { clear, getReport } from './core';
import NativeLiftoff from './NativeLiftoff';
import type { Report } from './types';

function formatLocalTime(wallMs: number): string {
  const d = new Date(wallMs);
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

// Optional peer dep — feature-detected at runtime, never crashes if absent.
let Clipboard: { setString(text: string): void } | null = null;
try {
  Clipboard = require('@react-native-clipboard/clipboard').default as {
    setString(text: string): void;
  };
} catch {
  // not installed
}

function DevMenuReportImpl(): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const [report, setReport] = useState<Report>({
    checkpoints: [],
    measurements: [],
  });

  useEffect(() => {
    const show = () => {
      setReport(getReport());
      setVisible(true);
    };

    DevSettings.addMenuItem('Show Liftoff Report', show);

    // Always listen on DeviceEventEmitter so in-app buttons can trigger the report.
    const deSub = DeviceEventEmitter.addListener('onShowReport', show);

    // On new arch, also subscribe via codegen EventEmitter so native code can trigger it.
    const nativeSub =
      typeof NativeLiftoff?.onShowReport === 'function'
        ? NativeLiftoff.onShowReport(show)
        : null;

    return () => {
      deSub.remove();
      nativeSub?.remove();
    };
  }, []);

  const handleClear = () => {
    clear();
    setVisible(false);
  };

  const handleCopy = () => {
    Clipboard?.setString(JSON.stringify(report, null, 2));
  };

  return (
    <Modal
      testID="liftoff-modal"
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Liftoff Report</Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.close}>&#x2715;</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body}>
            <Text style={styles.section}>Checkpoints</Text>
            {report.checkpoints.map((c, i) => {
              const firstTs = report.checkpoints[0]?.timestamp ?? c.timestamp;
              const delta = (c.timestamp - firstTs).toFixed(0);
              return (
                <Text key={i} style={styles.row}>
                  {formatLocalTime(c.wallTime)}
                  {'  +'}
                  {delta}
                  {'ms  '}
                  {c.name}
                </Text>
              );
            })}
            <Text style={styles.section}>Measurements</Text>
            {report.measurements.map((m, i) => (
              <Text key={i} style={styles.row}>
                {m.name}
                {'  '}
                {m.from} {'→'} {m.to}
                {'  '}({m.durationMs.toFixed(2)} ms)
              </Text>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            {Clipboard != null && (
              <TouchableOpacity
                testID="liftoff-copy-btn"
                style={styles.btn}
                onPress={handleCopy}
              >
                <Text style={styles.btnText}>Copy as JSON</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              testID="liftoff-clear-btn"
              style={[styles.btn, styles.btnDanger]}
              onPress={handleClear}
            >
              <Text style={styles.btnText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DevMenuReport(): React.ReactElement | null {
  if (!__DEV__) return null;
  return <DevMenuReportImpl />;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  title: { fontSize: 17, fontWeight: '600' },
  close: { fontSize: 18, color: '#666', paddingLeft: 16 },
  body: { paddingHorizontal: 16 },
  section: { fontWeight: '700', marginTop: 12, marginBottom: 4 },
  row: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
    color: '#333',
  },
  footer: { flexDirection: 'row', padding: 12, gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  btnDanger: { backgroundColor: '#FF3B30' },
  btnText: { color: '#fff', fontWeight: '600' },
});
