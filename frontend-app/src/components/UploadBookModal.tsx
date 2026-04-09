import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import {getToken} from '../services/auth';
import {BASE_URL} from '../constants/config';
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";


interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export default function UploadBookModal({visible, onClose, onUploadSuccess}: UploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const { colors } = useTheme();

  const pickAndUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets?.[0]) return;

      const file = res.assets[0];

      setUploading(true);

      const token = await getToken();
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);

      await axios.post(`${BASE_URL}/library/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Success', 'Book uploaded successfully!');
      setUploading(false);
      onClose();
      onUploadSuccess();
    } catch (err: any) {
      setUploading(false);
      Alert.alert('Upload failed', err.response?.data?.error || err.message || 'Failed to pick file');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, {backgroundColor: colors.card}]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={[styles.title, {color: colors.text}]}>Upload Book</Text>
          <Text style={[styles.subtitle, {color: colors.textDim}]}>Select an EPUB or PDF file</Text>

          {uploading ? (
            <View style={styles.uploading}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={[styles.progressText, {color: colors.text}]}>Uploading...</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.uploadBtn, {borderColor: colors.border, backgroundColor: colors.surface}]} onPress={pickAndUpload}>
              <Ionicons name="cloud-upload-outline" size={40} color={colors.accent} />
              <Text style={[styles.uploadText, {color: colors.text}]}>Choose File</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'},
  modal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  title: { fontSize: FONT_SIZES.xl, fontWeight: 'bold', marginTop: 12 },
  subtitle: { fontSize: FONT_SIZES.md, marginBottom: 24 },
  uploading: {alignItems: 'center', paddingVertical: 24},
  progressText: { fontSize: FONT_SIZES.md, marginTop: 16 },
  uploadBtn: {alignItems: 'center', justifyContent: 'center', paddingVertical: 40, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' },
  uploadText: { fontSize: FONT_SIZES.lg, marginTop: 8 },
});
