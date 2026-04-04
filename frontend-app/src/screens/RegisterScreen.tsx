import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import axios from 'axios';
import {AUTH_URL} from '../constants/config';
import {setToken} from '../services/auth';
import {COLORS, FONT_SIZES} from '../constants/theme';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavProp>();

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const {data} = await axios.post(`${AUTH_URL}/auth/register`, {
        email,
        password,
        displayName,
      });
      await setToken(data.token);
      navigation.reset({index: 0, routes: [{name: 'Main'}]});
    } catch (e: any) {
      Alert.alert('Registration failed', e.response?.data?.error || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start your reading journey</Text>

        <TextInput
          style={styles.input}
          placeholder="Display name (optional)"
          placeholderTextColor={COLORS.textDim}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', paddingHorizontal: 24},
  card: {backgroundColor: COLORS.card, borderRadius: 16, padding: 24},
  title: {color: COLORS.white, fontSize: FONT_SIZES.xxl, fontWeight: 'bold', marginBottom: 8},
  subtitle: {color: COLORS.textDim, fontSize: FONT_SIZES.md, marginBottom: 32},
  input: {
    backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
    fontSize: FONT_SIZES.md, borderWidth: 1, borderColor: COLORS.border,
  },
  button: {backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8},
  buttonText: {color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '600'},
  link: {color: COLORS.accent, textAlign: 'center', marginTop: 20, fontSize: FONT_SIZES.md},
});
