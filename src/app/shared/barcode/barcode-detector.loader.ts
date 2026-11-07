/** Ürün kutusunda görülen biçimler: perakende çizgi barkodlar, depo kodları ve ilaç karekodu (GS1 DataMatrix). */
const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'data_matrix', 'qr_code'] as const;

/** Okuma için `vendor/zxing` altına kopyalanan WASM dosyası (angular.json `assets`); dış CDN'e gidilmez. */
const ZXING_WASM_DIR = 'vendor/zxing/';

export interface DetectedBarcodeLike {
    readonly rawValue: string;
    readonly format: string;
}

export interface BarcodeDetectorLike {
    detect(source: HTMLVideoElement): Promise<readonly DetectedBarcodeLike[]>;
}

interface NativeBarcodeDetectorCtor {
    new (options?: { formats?: string[] }): BarcodeDetectorLike;
    getSupportedFormats(): Promise<string[]>;
}

/**
 * Önce tarayıcının kendi `BarcodeDetector`'ı (Android Chrome, macOS); yoksa ya da ürün barkodlarını desteklemiyorsa (iOS Safari,
 * Windows Chrome, Firefox) `barcode-detector` kütüphanesi aynı API ile devreye girer. Kütüphane yalnız bu durumda indirilir.
 */
export async function createBarcodeDetector(): Promise<BarcodeDetectorLike> {
    const native = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;

    if (native) {
        const supported = await native.getSupportedFormats().catch(() => [] as string[]);
        const formats = SCAN_FORMATS.filter((f) => supported.includes(f));

        if (formats.includes('ean_13')) {
            return new native({ formats });
        }
    }

    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');

    prepareZXingModule({
        overrides: {
            locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? new URL(ZXING_WASM_DIR + path, document.baseURI).href : prefix + path)
        }
    });

    return new BarcodeDetector({ formats: [...SCAN_FORMATS] });
}
