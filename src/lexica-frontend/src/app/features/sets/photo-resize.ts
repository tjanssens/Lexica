// Verkleint een gsm-foto vóór het uploaden: sneller over mobiele data en ruim onder de 5 MB-limiet
// van de server. 2400 px aan de lange zijde is genoeg om kleine boekletters nog goed te lezen.
const MAX_SIDE = 2400;
const JPEG_QUALITY = 0.85;

export async function prepareImportPhoto(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    // decode() houdt rekening met de EXIF-oriëntatie, zodat een rechtop genomen foto rechtop blijft.
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas niet beschikbaar');
    ctx.fillStyle = '#fff'; // transparante PNG's niet zwart laten worden
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Foto omzetten mislukt'))), 'image/jpeg', JPEG_QUALITY));
  } finally {
    URL.revokeObjectURL(url);
  }
}
