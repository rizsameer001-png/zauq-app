/**
 * Helper to dynamically load PDF.js from a CDN and render the first page of a PDF file or URL
 * onto a canvas, returning a Base64-encoded PNG data URL.
 */
export async function generatePdfThumbnail(fileOrUrl: File | string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Ensure pdfjsLib is loaded
      if (!(window as any).pdfjsLib) {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
        script.onload = () => {
          (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
          renderPdf();
        };
        script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
        document.head.appendChild(script);
      } else {
        renderPdf();
      }

      async function renderPdf() {
        try {
          const pdfjsLib = (window as any).pdfjsLib;
          let source: any;
          if (fileOrUrl instanceof File) {
            const arrayBuffer = await fileOrUrl.arrayBuffer();
            source = { data: new Uint8Array(arrayBuffer) };
          } else {
            source = { url: fileOrUrl };
          }

          const pdf = await pdfjsLib.getDocument(source).promise;
          const page = await pdf.getPage(1);
          
          // Render at a high enough resolution but compact size for a thumbnail
          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          
          if (!context) {
            reject(new Error("Failed to get 2D canvas context"));
            return;
          }
          
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          resolve(canvas.toDataURL("image/png"));
        } catch (err: any) {
          console.warn("PDF.js thumbnail generation failed:", err);
          reject(err);
        }
      }
    } catch (e) {
      reject(e);
    }
  });
}
