import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Svg, { Circle } from 'react-native-svg';
import { createPageScope } from 'react-native-liftoff';

const scope = createPageScope('HeavyList');

const DATA = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  label: `Item ${i + 1}`,
  color: `hsl(${(i * 37) % 360}, 70%, 50%)`,
}));

type Item = (typeof DATA)[number];

function ListItem({ item, onFirst }: { item: Item; onFirst?: () => void }) {
  useEffect(() => {
    if (item.id === 0) onFirst?.();
  }, [item.id, onFirst]);

  return (
    <View style={styles.item}>
      <Svg width={28} height={28} style={styles.icon}>
        <Circle cx={14} cy={14} r={12} fill={item.color} />
      </Svg>
      <Text style={styles.label}>{item.label}</Text>
    </View>
  );
}

export default function HeavyListScreen() {
  useEffect(() => {
    scope.mark('mounted');
  }, []);

  const handleFirstItem = useCallback(() => {
    scope.mark('firstItemRendered');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ListItem
        item={item}
        onFirst={item.id === 0 ? handleFirstItem : undefined}
      />
    ),
    [handleFirstItem]
  );

  return (
    <FlashList
      data={DATA}
      renderItem={renderItem}
      estimatedItemSize={52}
      keyExtractor={(item) => String(item.id)}
      onLoad={() => scope.markTTI()}
    />
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  icon: { marginRight: 12 },
  label: { fontSize: 14, color: '#333' },
});
