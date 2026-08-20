export const AVATAR_MAX_SOURCE_BYTES = 15 * 1024 * 1024;
export const AVATAR_MAX_SOURCE_LABEL = '15 MB';
export const AVATAR_OUTPUT_SIZE = 512;
export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 3;

export function isSvgFile(file) {
  return file.type === 'image/svg+xml' || /\.svg$/i.test(file.name ?? '');
}

export function isRasterImageFile(file) {
  return /^image\/(png|jpe?g|webp)$/i.test(file.type ?? '');
}

export function getBaseScale(image, viewportSize) {
  return Math.max(viewportSize / image.width, viewportSize / image.height);
}

export function clampOffset(image, viewportSize, scale, offsetX, offsetY) {
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const maxOffsetX = Math.max(0, (drawWidth - viewportSize) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - viewportSize) / 2);

  return {
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, offsetY)),
  };
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível carregar a imagem.'));
    };
    image.src = url;
  });
}

export async function cropImageToBlob(image, { viewportSize, zoom, offsetX, offsetY, outputSize = AVATAR_OUTPUT_SIZE }) {
  const baseScale = getBaseScale(image, viewportSize);
  const scale = baseScale * zoom;
  const ratio = outputSize / viewportSize;
  const scaledOffsetX = offsetX * ratio;
  const scaledOffsetY = offsetY * ratio;
  const scaledScale = scale * ratio;

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar o recorte.');

  ctx.beginPath();
  ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  const drawWidth = image.width * scaledScale;
  const drawHeight = image.height * scaledScale;
  const x = outputSize / 2 - drawWidth / 2 + scaledOffsetX;
  const y = outputSize / 2 - drawHeight / 2 + scaledOffsetY;

  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error('Não foi possível gerar a imagem recortada.'));
      },
      'image/jpeg',
      0.92,
    );
  });

  return blob;
}

export async function cropImageToFile(image, cropState, fileName = 'avatar.jpg') {
  const blob = await cropImageToBlob(image, cropState);
  return new File([blob], fileName.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
