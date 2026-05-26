import {useEffect, useRef, useState} from 'react';
import {ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {createPageScope} from 'react-native-liftoff';

const scope = createPageScope('Form');

type FormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};
type ErrorState = Partial<Record<keyof FormState, string>>;

const FIELDS: {
  key: keyof FormState;
  label: string;
  multiline?: boolean;
  keyboard?: 'default' | 'email-address' | 'phone-pad';
}[] = [
  {key: 'name', label: 'Name'},
  {key: 'email', label: 'Email', keyboard: 'email-address'},
  {key: 'phone', label: 'Phone', keyboard: 'phone-pad'},
  {key: 'message', label: 'Message', multiline: true},
];

function validate(field: keyof FormState, value: string): string | undefined {
  if (field === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Invalid email address';
  }
  if (field === 'phone' && value && !/^\d{7,15}$/.test(value)) {
    return 'Must be 7–15 digits';
  }
  if ((field === 'name' || field === 'message') && !value.trim()) {
    return 'Required';
  }
  return undefined;
}

export default function FormScreen() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const ttiMarked = useRef(false);

  useEffect(() => {
    scope.mark('mounted');
  }, []);

  const handleFocus = () => {
    if (!ttiMarked.current) {
      ttiMarked.current = true;
      scope.markTTI();
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setForm(prev => ({...prev, [field]: value}));
    const err = validate(field, value);
    setErrors(prev => ({...prev, [field]: err}));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Profile Form</Text>
      {FIELDS.map(({key, label, multiline, keyboard}) => (
        <View key={key} style={styles.fieldGroup}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={[styles.input, multiline && styles.multilineInput]}
            value={form[key]}
            onChangeText={v => handleChange(key, v)}
            onFocus={handleFocus}
            multiline={multiline}
            keyboardType={keyboard ?? 'default'}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#aaa"
          />
          {errors[key] ? <Text style={styles.error}>{errors[key]}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {padding: 20, paddingBottom: 40},
  heading: {fontSize: 17, fontWeight: '700', marginBottom: 20},
  fieldGroup: {marginBottom: 16},
  label: {fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6},
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  multilineInput: {height: 100, textAlignVertical: 'top'},
  error: {fontSize: 12, color: '#FF3B30', marginTop: 4},
});
