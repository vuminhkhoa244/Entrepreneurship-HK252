import { getDb } from '../db/index.js';

export function uploadEpubMetadata(db, bookId, fileUrl) {
  // Parse EPUB metadata - uses epub2
  const Epub = require('epub2');
  const ep = new Epub.default(fileUrl);
  // We need to read the file asynchronously - this is handled in the service
  return ep;
}

export async function extractEpubMetadata(filePath) {
  const Epub = (await import('epub2')).Epub;
  const book = new Epub(filePath);

  // epub2@3.x: metadata/chapters parsed on first access via parse()
  const meta = await book.open();
  await book.parse();

  return {
    title: book.metadata?.title || 'Unknown',
    author: book.metadata?.creator || 'Unknown',
    totalChapters: book.flow?.length || 0,
    chapters: book.flow?.map((ch, i) => ({
      id: ch.id,
      title: ch.title || `Chapter ${i + 1}`,
      href: ch.href,
      index: i
    })) || []
  };
}

export async function extractPdfInfo(filePath) {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = await import('fs').then(fs => fs.promises.readFile(filePath));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    totalPages: pdf.getPageCount(),
    title: pdf.getTitle() || 'Unknown',
    author: pdf.getAuthor() || 'Unknown'
  };
}
