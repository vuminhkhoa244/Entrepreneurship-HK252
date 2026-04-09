import React, {useContext, useState} from 'react';
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
import type {RootStackParamList} from '../types/navigation';
import axios from 'axios';
import {BASE_URL} from '../constants/config';
import {setToken} from '../services/auth';
import { FONT_SIZES, DARK_COLORS } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";

const defaultColors = DARK_COLORS;
import {AuthContext} from '../context/AuthContext';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavProp>();
  const { colors } = useTheme();
  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const {data} = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        displayName,
      });
      await setToken(data.token);
      navigation.navigate('Login');
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
          placeholderTextColor={defaultColors.textDim}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={defaultColors.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={defaultColors.textDim}
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
  container: {flex: 1, backgroundColor: defaultColors.background, justifyContent: 'center', paddingHorizontal: 24},
  card: {borderRadius: 16, padding: 24, backgroundColor: defaultColors.card},
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', marginBottom: 8, color: defaultColors.text },
  subtitle: { fontSize: FONT_SIZES.md, marginBottom: 32, color: defaultColors.textDim },
  input: {
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
    fontSize: FONT_SIZES.md, borderWidth: 1,
    borderColor: defaultColors.border,
    backgroundColor: defaultColors.surface,
    color: defaultColors.text,
  },
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8, backgroundColor: defaultColors.accent },
  buttonText: {color: defaultColors.white, fontSize: FONT_SIZES.md, fontWeight: '600'},
  link: { textAlign: 'center', marginTop: 20, fontSize: FONT_SIZES.md, color: defaultColors.accent },
});
