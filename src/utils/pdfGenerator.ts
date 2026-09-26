import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

/**
 * Generates and downloads a real PDF from a DOM element
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options?: {
    format?: 'a4' | 'thermal';
    quality?: number;
  }
): Promise<boolean> {
  try {
    const isThermal = options?.format === 'thermal';
    
    // Create high-res canvas snapshot of the element (scale 1.8 is crisp and lightweight)
    const canvas = await html2canvas(element, {
      scale: 1.8,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: isThermal ? 320 : 800,
      onclone: (clonedDoc) => {
        // Ensure memo in cloned DOM is rendered in clear light mode
        clonedDoc.documentElement.classList.remove('dark');
      },
    });

    // JPEG format with 0.85 compression reduces PDF size by over 95% (from 6MB down to ~200KB)
    const imgData = canvas.toDataURL('image/jpeg', options?.quality ?? 0.85);

    if (isThermal) {
      // 80mm thermal receipt format: 80mm width, dynamic height
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, Math.max(100, pdfHeight + 10)],
        compress: true,
      });

      pdf.addImage(imgData, 'JPEG', 0, 2, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return true;
    } else {
      // Standard A4 format: 210mm x 297mm
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pageHeight - margin * 2) {
        // Fits on single page
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
      } else {
        // Multi-page handling
        let heightLeft = contentHeight;
        let position = margin;

        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = heightLeft - contentHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }
      }

      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
      return true;
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

/**
 * Generates a File object containing the PDF for Web Share API / WhatsApp attachment
 */
export async function generateElementAsPdfFile(
  element: HTMLElement,
  filename: string,
  options?: {
    format?: 'a4' | 'thermal';
    quality?: number;
  }
): Promise<File | null> {
  try {
    const isThermal = options?.format === 'thermal';
    const canvas = await html2canvas(element, {
      scale: 1.8,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: isThermal ? 320 : 800,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.classList.remove('dark');
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', options?.quality ?? 0.85);
    let pdf: jsPDF;

    if (isThermal) {
      const pdfWidth = 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, Math.max(100, pdfHeight + 10)],
        compress: true,
      });
      pdf.addImage(imgData, 'JPEG', 0, 2, pdfWidth, pdfHeight, undefined, 'FAST');
    } else {
      pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pageHeight - margin * 2) {
        pdf.addImage(imgData, 'JPEG', margin, margin, contentWidth, contentHeight, undefined, 'FAST');
      } else {
        let heightLeft = contentHeight;
        let position = margin;
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - contentHeight + margin;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
          heightLeft -= pageHeight;
        }
      }
    }

    const blob = pdf.output('blob');
    const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    return new File([blob], safeName, { type: 'application/pdf' });
  } catch (err) {
    console.error('Error generating PDF File:', err);
    return null;
  }
}

/**
 * Generates an optimized JPEG Image File from the invoice DOM element
 */
export async function generateElementAsImageFile(
  element: HTMLElement,
  filename: string,
  options?: {
    format?: 'a4' | 'thermal';
  }
): Promise<File | null> {
  try {
    const isThermal = options?.format === 'thermal';
    const canvas = await html2canvas(element, {
      scale: 1.8,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: isThermal ? 320 : 800,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.classList.remove('dark');
      },
    });

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const baseName = filename.replace(/\.(png|jpg|jpeg)$/i, '');
          const safeName = `${baseName}.jpg`;
          const file = new File([blob], safeName, { type: 'image/jpeg' });
          resolve(file);
        },
        'image/jpeg',
        0.88
      );
    });
  } catch (err) {
    console.error('Error generating Image File:', err);
    return null;
  }
}

/**
 * Trigger immediate browser download of a File or Blob
 */
export function downloadFileDirectly(fileOrBlob: File | Blob, filename: string) {
  const url = URL.createObjectURL(fileOrBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Download a DOM element directly as an optimized lightweight JPG image file
 */
export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
  options?: {
    format?: 'a4' | 'thermal';
    quality?: number;
  }
): Promise<boolean> {
  try {
    const file = await generateElementAsImageFile(element, filename, options);
    if (!file) return false;
    downloadFileDirectly(file, file.name);
    return true;
  } catch (err) {
    console.error('Error downloading element as image:', err);
    return false;
  }
}

/**
 * Prints HTML content safely via a temporary hidden iframe without printing external UI chrome
 */
export function printHtmlViaIframe(html: string): void {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.warn('Iframe print fallback to window.print', e);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }
    }, 400);
  } catch (err) {
    console.error('Print iframe failed:', err);
    window.print();
  }
}

