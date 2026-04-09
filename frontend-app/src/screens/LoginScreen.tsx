import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import {BASE_URL} from '../constants/config';
import {setToken} from '../services/auth';
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
import {AuthContext} from '../context/AuthContext';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NavProp>();
  const {login} = useContext(AuthContext);
  
  const { colors } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const {data} = await axios.post(`${BASE_URL}/auth/login`, {
        email,
        password,
      });
      await setToken(data.token);
      login(data.user);
      // navigation.replace('Main');
    } catch (e: any) {
      Alert.alert('Login failed', e.response?.data?.error || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.welcome}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue reading</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background, justifyContent: 'center', paddingHorizontal: 24},
  card: {borderRadius: 16, padding: 24, backgroundColor: colors.card},
  welcome: {fontSize: FONT_SIZES.xxl, fontWeight: 'bold', marginBottom: 8, color: colors.text},
  subtitle: { fontSize: FONT_SIZES.md, marginBottom: 32, color: colors.textDim },
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: FONT_SIZES.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.accent,
  },
  buttonText: {color: colors.white, fontSize: FONT_SIZES.md, fontWeight: '600'},
  link: { textAlign: 'center', marginTop: 20, fontSize: FONT_SIZES.md, color: colors.accent },
});
