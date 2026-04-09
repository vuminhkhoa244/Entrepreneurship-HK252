// Navigation types extracted to break circular dependency with App.tsx

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
  BookDetail: {bookId: string};
  Reader: {bookId: string; fileType: 'epub' | 'pdf'};
  PDFReader: {bookId: string};
  Notes: {bookId: string};
};

export type MainTabParamList = {
  Library: undefined;
  Stats: undefined;
  Settings: undefined;
};
