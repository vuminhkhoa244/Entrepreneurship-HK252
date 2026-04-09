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
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";
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
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.card, {backgroundColor: colors.card}]}>
        <Text style={[styles.title, {color: colors.text}]}>Create Account</Text>
        <Text style={[styles.subtitle, {color: colors.textDim}]}>Start your reading journey</Text>

        <TextInput
          style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surface, color: colors.text}]}
          placeholder="Display name (optional)"
          placeholderTextColor={colors.textDim}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surface, color: colors.text}]}
          placeholder="Email"
          placeholderTextColor={colors.textDim}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={[styles.input, {borderColor: colors.border, backgroundColor: colors.surface, color: colors.text}]}
          placeholder="Password"
          placeholderTextColor={colors.textDim}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={[styles.button, {backgroundColor: colors.accent}]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, {color: colors.white}]}>Sign Up</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.link, {color: colors.accent}]}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', paddingHorizontal: 24},
  card: {borderRadius: 16, padding: 24},
  title: { fontSize: FONT_SIZES.xxl, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: FONT_SIZES.md, marginBottom: 32 },
  input: {
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16,
    fontSize: FONT_SIZES.md, borderWidth: 1, borderRadius: 12,
  },
  button: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { fontSize: FONT_SIZES.md, fontWeight: '600'},
  link: { textAlign: 'center', marginTop: 20, fontSize: FONT_SIZES.md },
});
