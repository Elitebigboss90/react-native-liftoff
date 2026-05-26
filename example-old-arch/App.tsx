import {useEffect} from 'react';
import {
  DeviceEventEmitter,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {mark, measure, getReport, DevMenuReport} from 'react-native-liftoff';

mark('js:appComponent:render');

export default function App() {
  useEffect(() => {
    mark('js:appComponent:mounted');
    const nativeStart =
      Platform.OS === 'ios'
        ? 'app:didFinishLaunching:start'
        : 'app:onCreate:start';
    measure('boot:native-init', nativeStart, 'js:appComponent:render');
    measure(
      'boot:react-tree',
      'js:appComponent:render',
      'js:appComponent:mounted',
    );
  }, []);

  const report = getReport();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Boot Checkpoints</Text>
      <View style={styles.table}>
        {report.checkpoints.length === 0 ? (
          <Text style={styles.empty}>No checkpoints yet.</Text>
        ) : (
          report.checkpoints.map((cp, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cpName}>{cp.name}</Text>
              <Text style={styles.cpTime}>{cp.timestamp.toFixed(2)} ms</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.heading}>Measurements</Text>
      <View style={styles.table}>
        {report.measurements.length === 0 ? (
          <Text style={styles.empty}>No measurements yet.</Text>
        ) : (
          report.measurements.map((m, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cpName}>{m.name}</Text>
              <Text style={styles.cpTime}>{m.durationMs.toFixed(2)} ms</Text>
            </View>
          ))
        )}
      </View>

      {__DEV__ && (
        <TouchableOpacity
          style={styles.button}
          onPress={() => DeviceEventEmitter.emit('onShowReport')}>
          <Text style={styles.buttonText}>Show Boot Report</Text>
        </TouchableOpacity>
      )}

      <DevMenuReport />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16, paddingBottom: 32},
  heading: {fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8},
  table: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  empty: {color: '#999', fontStyle: 'italic', fontSize: 13},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  cpName: {fontFamily: 'monospace', fontSize: 12, flex: 1, color: '#333'},
  cpTime: {fontFamily: 'monospace', fontSize: 12, color: '#007AFF'},
  button: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: {color: '#fff', fontWeight: '600', fontSize: 15},
});
