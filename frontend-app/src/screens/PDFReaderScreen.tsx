import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import {ReaderAPI} from '../services/api';
import {BASE_URL} from '../constants/config';
import {COLORS, FONT_SIZES} from '../constants/theme';

export default function PDFReaderScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {bookId} = route.params as {bookId: string};

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState(0);

  // Start session
  useEffect(() => {
    ReaderAPI.startSession(bookId)
      .then(res => setSessionId(res.data.sessionId))
      .catch(() => {});
  }, [bookId]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionId) {
        ReaderAPI.endSession(bookId, sessionId, pagesRead).catch(() => {});
      }
    };
  }, [sessionId, pagesRead, bookId]);

  // Open PDF in system browser/viewer
  useEffect(() => {
    (async () => {
      try {
        const pdfUrl = `${BASE_URL}/reader/${bookId}/file`;
        const result = await WebBrowser.openBrowserAsync(pdfUrl, {
          enableBarCollapsing: true,
          // Show done button so user can navigate back
          controlsColor: COLORS.accent,
        });
        // Track as read when browser closes
        setPagesRead(1);
        navigation.goBack();
      } catch {
        Alert.alert('Error', 'Failed to open PDF');
      }
    })();
  }, [bookId]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.loadingText}>Opening PDF viewer...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background},
  loadingText: {color: COLORS.textDim, fontSize: FONT_SIZES.md, marginTop: 16},
});
