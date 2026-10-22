/**
 * Dosya katmanı sözleşmesi (`docs/IMAGING_API_CONTRACT.md` §5). Görüntüleme ve lab dosyaları aynı biçimdedir; uçlar sahip kaydın
 * köküne göre çözülür (`ApiEndpoints.storedFiles`).
 */
export type StoredFileKind = 'Image' | 'Pdf';

/** `StoredFileDto` — yalnız hazır (`Ready`) dosyalar döner; depolama anahtarı istemciye gelmez. */
export interface StoredFileDto {
    id: string;
    fileName: string;
    contentType: string;
    kind: StoredFileKind | string;
    sizeBytes: number;
    sha256?: string | null;
    uploadedAtUtc: string;
    uploadedByUserId?: string | null;
}

export interface StoredFileVm {
    id: string;
    fileName: string;
    contentType: string;
    kind: StoredFileKind;
    sizeBytes: number;
    uploadedAtUtc: string;
}

/** `POST .../files/{fileId}/access-url` yanıtı; `url` API köküne görelidir. */
export interface StoredFileAccessUrlDto {
    url: string;
    expiresAtUtc: string;
}

/** Yükleme akışı: ilerleme yüzdesi, sonunda kaydedilen dosya. */
export type StoredFileUploadEvent = { type: 'progress'; percent: number } | { type: 'done'; file: StoredFileVm };
