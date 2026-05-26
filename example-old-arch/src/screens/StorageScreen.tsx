import {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {MMKV} from 'react-native-mmkv';
import {createPageScope} from 'react-native-liftoff';

const scope = createPageScope('Storage');
const mmkv = new MMKV();

export default function StorageScreen() {
  const [mmkvValue, setMmkvValue] = useState<string | undefined>(undefined);
  const [asyncValue, setAsyncValue] = useState<string | null>(null);

  useEffect(() => {
    // Synchronous MMKV — marks are back-to-back
    scope.mark('mmkv:start');
    mmkv.set('liftoff_test', 'hello_mmkv');
    const mmkvResult = mmkv.getString('liftoff_test');
    setMmkvValue(mmkvResult);
    scope.mark('mmkv:done');

    // Async storage
    scope.mark('asyncStorage:start');
    AsyncStorage.setItem('liftoff_test', 'hello_async')
      .then(() => AsyncStorage.getItem('liftoff_test'))
      .then(val => {
        setAsyncValue(val);
        scope.mark('asyncStorage:done');
        scope.markTTI();
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Storage Round-trip</Text>
      <Row label="MMKV" value={mmkvValue ?? '…'} />
      <Row label="AsyncStorage" value={asyncValue ?? '…'} />
      <Text style={styles.note}>
        Open the report to see mmkv:start/done and asyncStorage:start/done
        marks.
      </Text>
    </View>
  );
}

function Row({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 24},
  heading: {fontSize: 17, fontWeight: '700', marginBottom: 20},
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  label: {fontSize: 15, color: '#333', fontWeight: '500'},
  value: {fontFamily: 'monospace', fontSize: 13, color: '#007AFF'},
  note: {marginTop: 24, fontSize: 13, color: '#999', fontStyle: 'italic'},
});
