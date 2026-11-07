/**
 * Yüklemeden önce tarayıcıda küçültme (ADR-045 K12): backend görsel işlemez, tür ve boyutu yine zorlar. Her görsel yeniden kodlanır;
 * böylece fotoğrafın konum ve cihaz bilgisi (EXIF) herkese açık siteye taşınmaz.
 */
export const SITE_IMAGE_MAX_SIDE = 2400;
export const SITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Tarayıcı belleğini korur: bundan büyük dosya küçültülmeye çalışılmaz. */
export const SITE_IMAGE_INPUT_MAX_BYTES = 40 * 1024 * 1024;
const ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];
const QUALITIES: readonly number[] = [0.86, 0.78, 0.7, 0.6, 0.5];

export class SiteImageFileError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new SiteImageFileError('Dosya görsel olarak açılamadı. JPEG, PNG ya da WebP deneyin.'));
        };

        image.src = url;
    });
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function draw(image: HTMLImageElement, width: number, height: number, opaque: boolean): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    if (!context) {
        throw new SiteImageFileError('Görsel hazırlanamadı.');
    }

    if (opaque) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    return canvas;
}

/** En uzun kenarı `maxSide` olacak şekilde küçültür, WebP yazar (tarayıcı yazamıyorsa JPEG, saydamlık beyaza düşer). Hiç büyütmez. */
export async function prepareSiteImage(file: File, maxSide: number = SITE_IMAGE_MAX_SIDE): Promise<File> {
    if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new SiteImageFileError('Yalnız JPEG, PNG ve WebP yüklenebilir.');
    }

    if (file.size > SITE_IMAGE_INPUT_MAX_BYTES) {
        throw new SiteImageFileError('Dosya çok büyük (en çok 40 MB).');
    }

    const image = await loadImage(file);
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'gorsel';
    let scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));

    for (let attempt = 0; attempt < 4; attempt++) {
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const webp = await encode(draw(image, width, height, false), 'image/webp', QUALITIES[0]);
        const type = webp?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const canvas = type === 'image/webp' ? draw(image, width, height, false) : draw(image, width, height, true);

        for (const quality of QUALITIES) {
            const blob = await encode(canvas, type, quality);

            if (blob && blob.size <= SITE_IMAGE_MAX_BYTES) {
                return new File([blob], `${baseName}.${type === 'image/webp' ? 'webp' : 'jpg'}`, { type });
            }
        }

        scale *= 0.75;
    }

    throw new SiteImageFileError('Görsel 5 MB altına indirilemedi. Daha küçük bir dosya deneyin.');
}
