import { Text, View, StyleSheet } from 'react-native';
import { mark, getReport } from 'react-native-liftoff';

mark('app:start');
const report = getReport();

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Checkpoints: {report.checkpoints.length}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
