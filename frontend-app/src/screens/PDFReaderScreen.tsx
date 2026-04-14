import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {WebView} from 'react-native-webview';
import {useRoute, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import {ReaderAPI, LibraryAPI} from '../services/api';
import { BASE_URL } from '../constants/config';
import { getToken } from '../services/auth';
import { FONT_SIZES } from "../constants/theme";
import { useTheme } from "../context/ThemeContext";


const PDF_VIEWER_HTML = (baseUrl: string, bookId: string, token: string, colors: any) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: ${colors.background}; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
    #container { width: 100vw; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
    #loader { color: ${colors.textDim}; text-align: center; padding: 40px 20px; }
    #error { display: none; color: ${colors.error}; text-align: center; padding: 40px 20px; max-width: 80vw; }
    canvas { display: block; max-width: 100%; margin: 0 auto; }
  </style>
  <script type="module">
    import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

    (async () => {
      const pdfUrl = '${baseUrl}/reader/${bookId}/file?token=${token}';

      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        document.getElementById('loader').style.display = 'none';

        const container = document.getElementById('container');
        
        // Track scroll position to report current page
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const pageNum = parseInt(entry.target.getAttribute('data-page'));
              window.ReactNativeWebView.postMessage(
                JSON.stringify({ currentPage: pageNum })
              );
            }
          });
        }, { threshold: 0.5 });

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          // Container div for each page
          const pageDiv = document.createElement('div');
          pageDiv.style.width = '100%';
          pageDiv.style.display = 'flex';
          pageDiv.style.justifyContent = 'center';
          pageDiv.style.marginBottom = '4px';
          pageDiv.setAttribute('data-page', i);
          pageDiv.appendChild(canvas);
          container.appendChild(pageDiv);

          observer.observe(pageDiv);

          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        window.ReactNativeWebView.postMessage(
          JSON.stringify({ pages: pdf.numPages })
        );
      } catch (err) {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('error').textContent = 'Failed to load PDF: ' + err.message;
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ error: err.message })
        );
      }
    })();
  </script>
</head>
<body>
  <div id="loader">Loading PDF...</div>
  <div id="container"></div>
  <div id="error"></div>
</body>
</html>
`;

export default function PDFReaderScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { bookId } = route.params as { bookId: string };

  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pagesRead, setPagesRead] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [html, setHtml] = useState<string | null>(null);
  const { colors } = useTheme();
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

  // Load book metadata and save progress on exit
  useEffect(() => {
    (async () => {
      try {
        const { data: book } = await LibraryAPI.get(bookId);
        if (book) {
          setTotalPages(book.total_pages || 0);
          setCurrentPage(book.current_page || 0);
        }
      } catch {}
    })();

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      ReaderAPI.setProgress(bookId, currentPage, currentPage, totalPages, undefined).catch(() => {});
    });
    return unsubscribe;
  }, [bookId, navigation, currentPage, totalPages]);

  // Build PDF viewer HTML
  useEffect(() => {
    (async () => {
      const token = await getToken();
      const viewerHtml = PDF_VIEWER_HTML(BASE_URL, bookId, token ?? '', colors);
      setHtml(viewerHtml);
    })();
  }, [bookId]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.pages) {
        setLoading(false);
        setPagesRead(data.pages);
      }
      if (data.currentPage) {
        setCurrentPage(data.currentPage);
      }
      if (data.error) {
        setLoading(false);
        Alert.alert('PDF Error', data.error);
      }
    } catch {}
  }, []);

  if (!html) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading PDF viewer...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reading PDF</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* WebView rendering PDF */}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textDim }]}>Rendering PDF...</Text>
        </View>
      )}

      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ display: loading ? 'none' : 'flex' }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, 
    borderBottomWidth: 1, 
  },
  headerTitle: {  fontSize: FONT_SIZES.md, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loader: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center' },
  loadingText: { fontSize: FONT_SIZES.md, marginTop: 16 },
});
