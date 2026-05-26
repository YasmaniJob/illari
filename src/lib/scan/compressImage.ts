const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** Reduce tamaño en cliente; el blob no se guarda, solo se envía al API */
export async function compressImageForScan(file: File): Promise<{
  base64: string;
  mimeType: string;
}> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se permiten imágenes');
  }

  if (file.size < 400_000 && file.type === 'image/jpeg') {
    const base64 = await readAsBase64(file);
    return { base64, mimeType: file.type };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Compresión fallida'))), 'image/jpeg', JPEG_QUALITY);
  });

  const base64 = await readAsBase64(blob);
  return { base64, mimeType: 'image/jpeg' };
}

function readAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const data = result.split(',')[1];
      if (!data) reject(new Error('Lectura inválida'));
      else resolve(data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
