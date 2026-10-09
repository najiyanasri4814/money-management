/**
 * Client-side PDF export helpers.
 *
 * Captures a rendered DOM element (charts + stats) as a multi-page PDF.
 * Uses jsPDF + html2canvas; both are loaded on demand by callers via
 * dynamic import so they never bloat the initial page bundle.
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Capture `element` (a rendered region of the page) into a .pdf and trigger
 * a download. Splits tall content across A4 pages.
 *
 * `removeSelectors` — CSS selectors whose nodes are stripped from the cloned
 * document before capture (e.g. buttons/toolbars that shouldn't appear in the
 * exported PDF).
 */
export async function captureElementToPdf(
  element: HTMLElement,
  filename: string,
  removeSelectors: string[] = []
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2, // crisp text/charts
    useCORS: true,
    backgroundColor: "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    logging: false,
    onclone: (doc) => {
      for (const sel of removeSelectors) {
        doc.querySelectorAll(sel).forEach((el) => el.remove());
      }
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Image height in mm so it keeps aspect ratio across the A4 width.
  const imgHeight = (canvas.height * pageWidth) / canvas.width;

  let remaining = imgHeight;
  let yPos = 0;
  pdf.addImage(imgData, "JPEG", 0, yPos, pageWidth, imgHeight);
  remaining -= pageHeight;

  while (remaining > 0) {
    yPos -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, yPos, pageWidth, imgHeight);
    remaining -= pageHeight;
  }

  pdf.save(filename);
}

/** "2026-10-09" style date used in export filenames. */
export function todayFilenameStamp(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}