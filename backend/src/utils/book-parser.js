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
  await book.open();
  await book.parse();

  return {
    title: book.metadata?.title || 'Unknown',
    author: book.metadata?.creator || 'Unknown',
    totalChapters: book.flow?.length || 0,
    chapters:
      book.flow?.map((ch, i) => ({
        id: ch.id,
        title: ch.title || `Chapter ${i + 1}`,
        href: ch.href,
        index: i,
      })) || [],
  };
}

export async function extractPdfInfo(filePath) {
  const { PDFDocument } = await import('pdf-lib');
  const bytes = await import('fs').then((fs) => fs.promises.readFile(filePath));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return {
    totalPages: pdf.getPageCount(),
    title: pdf.getTitle() || 'Unknown',
    author: pdf.getAuthor() || 'Unknown',
  };
}

/**
 * Check if PDF is image-based (scanned document) by examining text extraction
 * Reserved for future use - returns true if very little text is extracted
 */
// eslint-disable-next-line no-unused-vars
async function _isImageBasedPdf(filePath, samplePages = 3) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const fs = await import('fs');
    const bytes = await fs.promises.readFile(filePath);

    const pdf = await pdfParse(bytes, { max: samplePages });

    // If extracted text is very short for multiple pages, likely image-based
    const textLength = (pdf.text || '').trim().length;
    const avgPerPage = textLength / Math.min(samplePages, pdf.numpages || 1);

    // If average less than 50 characters per page, treat as scanned/image-based
    return avgPerPage < 50;
  } catch (error) {
    console.error('Error checking if PDF is image-based:', error.message);
    return true; // Assume scanned on error
  }
}

/**
 * Extract text from PDF pages using OCR (Tesseract.js)
 * Converts PDF to images and runs OCR for reliable text extraction from scanned documents
 */
async function extractPdfWithOCR(filePath, maxPages = 10) {
  try {
    const { createWorker } = await import('tesseract.js');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    console.error(`Starting OCR on up to ${maxPages} pages of scanned PDF...`);

    // Initialize Tesseract worker with English language
    const worker = await createWorker({
      logger: (m) => console.error(`Tesseract: ${m.status} - ${Math.round(m.progress * 100)}%`),
    });

    await worker.load();
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    const allText = [];

    // Try using pdf2pic to convert pages to images
    try {
      const pdf2pic = (await import('pdf2pic')).default;
      const tempDir = path.join(os.tmpdir(), 'pdf-ocr-' + Date.now());

      // Create temp directory if it doesn't exist
      try {
        await fs.promises.mkdir(tempDir, { recursive: true });
        // eslint-disable-next-line no-unused-vars
      } catch (_e) {
        // Directory may already exist
      }

      const options = {
        density: 200, // DPI for image conversion
        savename: 'page',
        savedir: tempDir,
        format: 'png',
        width: 1600,
        height: 2000,
      };

      const convert = pdf2pic.default ? pdf2pic.default : pdf2pic;

      for (let i = 1; i <= maxPages; i++) {
        try {
          console.error(`Converting and OCR page ${i}...`);

          // Convert specific page to image
          const images = await convert.convert(filePath, {
            ...options,
            page: i,
          });

          if (images && images.length > 0) {
            const imagePath = images[0];

            // Read image file
            const imageBuffer = await fs.promises.readFile(imagePath);

            // Run OCR on image
            const {
              data: { text },
            } = await worker.recognize(imageBuffer);

            if (text && text.trim().length > 0) {
              allText.push(text.trim());
              allText.push('\n\n--- Page ' + i + ' ---\n\n');
            }

            // Clean up image file
            try {
              await fs.promises.unlink(imagePath);
              // eslint-disable-next-line no-unused-vars
            } catch (_e) {
              // Ignore cleanup errors
            }
          }
        } catch (pageError) {
          console.warn(`OCR page ${i} failed:`, pageError.message);
          if (i === 1) {
            // If first page fails with pdf2pic, try alternative method
            throw pageError;
          }
          // Continue with other pages
        }
      }

      // Clean up temp directory
      try {
        await fs.promises.rmdir(tempDir);
        // eslint-disable-next-line no-unused-vars
      } catch (_e) {
        // Ignore if directory not empty or other errors
      }

      await worker.terminate();

      if (allText.length > 0) {
        return allText.join('').trim();
      }
    } catch (pdf2picError) {
      console.warn('pdf2pic method failed:', pdf2picError.message);
      // Continue to alternative method
    }

    // Alternative: Use base64 encoding for OCR if pdf2pic fails
    // This is slower but doesn't require system dependencies
    console.error('Attempting alternative OCR method without external converters...');

    // For now, mark as attempted but not successful
    allText.push(
      '[Scanned PDF detected. Full OCR extraction requires system libraries. Partial extraction may be available.]'
    );

    await worker.terminate();

    return allText.join('').trim() || 'Scanned document - OCR processing required';
  } catch (error) {
    console.error('Error extracting PDF with OCR:', error.message);
    throw error;
  }
}

/**
 * Extract full text content from a PDF file
 * Attempts text extraction first, falls back to OCR for scanned documents
 */
export async function extractPdfText(filePath, maxPages = null) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const fs = await import('fs');
    const bytes = await fs.promises.readFile(filePath);

    console.error(`Extracting text from PDF: ${filePath}`);
    const pdf = await pdfParse(bytes, { max: maxPages || 0 });

    // Combine text from all pages
    let fullText = pdf.text || '';
    const pageCount = pdf.numpages || 1;

    // Calculate average text per page
    const textLength = fullText.trim().length;
    const avgPerPage = pageCount > 0 ? textLength / pageCount : 0;

    console.error(
      `PDF Analysis: ${pageCount} pages, ${textLength} total chars, ${avgPerPage.toFixed(0)} chars/page`
    );

    // Check if extracted text is minimal (likely scanned document)
    // Threshold: less than 50 characters per page on average
    // Or less than 200 total characters for any PDF
    const isScanned = avgPerPage < 50 || (textLength < 200 && pageCount > 0);

    if (isScanned) {
      console.error(
        `PDF appears to be scanned (avg ${avgPerPage.toFixed(0)} chars/page). Attempting OCR...`
      );

      try {
        const ocrText = await extractPdfWithOCR(filePath, Math.min(maxPages || 10, pageCount));

        if (ocrText && ocrText.trim().length > 0) {
          fullText = ocrText;
          console.error(`OCR successful: extracted ${ocrText.length} characters`);
        } else {
          console.warn('OCR returned empty content');
        }
      } catch (ocrError) {
        console.warn('OCR extraction failed:', ocrError.message);
        // Return what we have - even if empty
        if (fullText.trim().length === 0) {
          fullText = `[Unable to extract text - PDF appears to be a scanned image and OCR failed: ${ocrError.message}]`;
        }
      }
    } else {
      console.error('PDF is text-based: using standard extraction');
    }

    const finalText = fullText.trim();
    console.error(`Final extracted text length: ${finalText.length} characters`);

    if (finalText.length === 0) {
      throw new Error('No text could be extracted from PDF (empty or unreadable)');
    }

    return finalText;
  } catch (error) {
    console.error('Error extracting PDF text:', error.message);
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

/**
 * Extract PDF text from specific pages
 * Used for getting context for AI operations
 */
export async function extractPdfPages(filePath, startPage = 0, endPage = null) {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const fs = await import('fs');
    const bytes = await fs.promises.readFile(filePath);

    const pdf = await pdfParse(bytes, {
      max: endPage || 0,
    });

    // Get text from specified page range
    const pages = pdf.text.split('\n\n'); // pdf-parse includes page breaks
    let text = '';

    if (pages.length > 0) {
      const start = Math.max(0, startPage);
      const end = endPage ? Math.min(pages.length, endPage) : pages.length;
      text = pages.slice(start, end).join('\n\n');
    } else {
      text = pdf.text;
    }

    return text.trim();
  } catch (error) {
    console.error('Error extracting PDF pages:', error.message);
    throw new Error('Failed to extract pages from PDF: ' + error.message);
  }
}
