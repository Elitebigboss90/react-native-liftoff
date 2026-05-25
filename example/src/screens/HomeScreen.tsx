import { useEffect } from 'react';
import {
  DeviceEventEmitter,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createPageScope, measure, getReport } from 'react-native-liftoff';
import type { RootStackParamList } from '../App';

const scope = createPageScope('Home');

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const SCREENS = ['HeavyList', 'Animated', 'Storage', 'Form'] as const;

export default function HomeScreen() {
  const navigation = useNavigation<NavProp>();

  useEffect(() => {
    scope.mark('mounted');
    scope.markTTI();
    measure('boot:total', 'app:didFinishLaunching:start', 'page:Home:tti');
    measure('boot:js-to-tti', 'js:appComponent:mounted', 'page:Home:tti');
  }, []);

  const report = getReport();
  const bootCheckpoints = report.checkpoints.filter(
    (c) => !c.name.startsWith('page:')
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Boot Timeline</Text>
      <View style={styles.table}>
        {bootCheckpoints.length === 0 ? (
          <Text style={styles.empty}>No native boot marks yet.</Text>
        ) : (
          bootCheckpoints.map((cp, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cpName}>{cp.name}</Text>
              <Text style={styles.cpTime}>{cp.timestamp.toFixed(2)} ms</Text>
            </View>
          ))
        )}
      </View>

      <Text style={styles.heading}>Screens</Text>
      {SCREENS.map((screen) => (
        <TouchableOpacity
          key={screen}
          style={styles.button}
          onPress={() => navigation.navigate(screen)}
        >
          <Text style={styles.buttonText}>{screen}</Text>
        </TouchableOpacity>
      ))}

      {__DEV__ && (
        <TouchableOpacity
          style={[styles.button, styles.devButton]}
          onPress={() => DeviceEventEmitter.emit('LiftoffShowReport')}
        >
          <Text style={styles.buttonText}>Show Boot Report</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  table: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  empty: { color: '#999', fontStyle: 'italic', fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  cpName: { fontFamily: 'monospace', fontSize: 12, flex: 1, color: '#333' },
  cpTime: { fontFamily: 'monospace', fontSize: 12, color: '#007AFF' },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  devButton: { backgroundColor: '#34C759' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
