import { rgbToHex, rgbToHsl } from '@site-engine';

/**
 * Logonun baskın rengini tarayıcıda çıkarır. Saydam, beyaza ve siyaha yakın pikseller sayılmaz; kalanlar ton kovasına ayrılır,
 * en çok ve en doygun kovanın ortalaması döner. Belirgin renk yoksa `null`: bu durumda ekranda renk uydurulmaz.
 */
export function dominantColor(url: string): Promise<string | null> {
    return new Promise((resolve) => {
        const image = new Image();

        image.onerror = () => resolve(null);

        image.onload = () => {
            const size = 64;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });

            if (!context) {
                resolve(null);

                return;
            }

            canvas.width = size;
            canvas.height = size;
            context.drawImage(image, 0, 0, size, size);

            const { data } = context.getImageData(0, 0, size, size);
            const buckets = new Map<number, { r: number; g: number; b: number; count: number; weight: number }>();

            for (let index = 0; index < data.length; index += 4) {
                const [r, g, b, a] = [data[index], data[index + 1], data[index + 2], data[index + 3]];

                if (a < 128) continue;

                const { h, s, l } = rgbToHsl({ r, g, b });

                if (l > 0.93 || l < 0.08 || s < 0.15) continue;

                const key = Math.round(h / 24);
                const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0, weight: 0 };

                bucket.r += r;
                bucket.g += g;
                bucket.b += b;
                bucket.count += 1;
                bucket.weight += 1 + s;
                buckets.set(key, bucket);
            }

            const best = [...buckets.values()].sort((a, b) => b.weight - a.weight)[0];

            resolve(best && best.count >= 12 ? rgbToHex({ r: best.r / best.count, g: best.g / best.count, b: best.b / best.count }) : null);
        };

        image.src = url;
    });
}
