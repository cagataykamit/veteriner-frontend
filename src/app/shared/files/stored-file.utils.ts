import type { StoredFileDto, StoredFileVm } from '@/app/shared/files/stored-file.model';

/** Sunucu varsayılanı (`FileStorage:MaxFileBytes`, 15 MB). Ön kontrol yalnız kullanıcıya erken bilgi verir; asıl denetim sunucudadır. */
export const STORED_FILE_MAX_BYTES = 15 * 1024 * 1024;

/** İzinli türler: JPEG, PNG, WebP, PDF (sözleşme §2). Sunucu türü içerikten belirler; buradaki liste yalnız ön kontroldür. */
export const STORED_FILE_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf';

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export const STORED_FILE_TYPE_MESSAGE = 'Yalnız JPEG, PNG, WebP görüntü ve PDF dosyası yüklenebilir.';

export function storedFileSizeMessage(maxBytes = STORED_FILE_MAX_BYTES): string {
    return `Dosya en çok ${Math.floor(maxBytes / (1024 * 1024))} MB olabilir.`;
}

/** Seçilen dosyanın ön kontrolü (tür ve boyut); sorun yoksa `null`. */
export function precheckStoredFile(file: Pick<File, 'name' | 'type' | 'size'>, maxBytes = STORED_FILE_MAX_BYTES): string | null {
    const name = file.name.toLowerCase();
    const extensionOk = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const typeOk = ALLOWED_TYPES.includes(file.type.toLowerCase());

    if (!extensionOk && !typeOk) {
        return STORED_FILE_TYPE_MESSAGE;
    }

    if (file.size <= 0) {
        return 'Dosya boş.';
    }

    return file.size > maxBytes ? storedFileSizeMessage(maxBytes) : null;
}

/** Dosya hata kodlarının kullanıcı metni (sözleşme §5); bilinmeyen kodda `null`. */
export function storedFileProblemMessage(code: string | null | undefined): string | null {
    switch (code) {
        case 'Files.UnsupportedType':
            return STORED_FILE_TYPE_MESSAGE + ' Dosyanın içeriği izinli bir türde değil.';
        case 'Files.TooLarge':
            return storedFileSizeMessage();
        case 'Files.LimitReached':
            return 'Bu kayda eklenebilecek en çok dosya sayısına ulaşıldı.';
        case 'Files.StorageUnavailable':
            return 'Dosya deposu şu anda kullanılamıyor; daha sonra tekrar deneyin.';
        case 'Files.MalwareDetected':
            return 'Dosya güvenlik taramasından geçemedi.';
        case 'Files.NotFound':
            return 'Dosya bulunamadı veya erişim kapatılmış.';
        case 'Examinations.Finalized':
            return 'Bağlı muayene kesinleştiği için bu kayda dosya eklenemez; yeni görüntüleme kaydı oluşturun.';
        case 'ImagingRecords.AlreadyCancelled':
        case 'LabResults.AlreadyCancelled':
            return 'Kayıt iptal edilmiş; dosya eklenemez.';
        default:
            return null;
    }
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function mapStoredFileDtoToVm(dto: StoredFileDto): StoredFileVm {
    return {
        id: dto.id,
        fileName: dto.fileName?.trim() || 'dosya',
        contentType: dto.contentType,
        kind: dto.kind === 'Pdf' || dto.contentType === 'application/pdf' ? 'Pdf' : 'Image',
        sizeBytes: dto.sizeBytes ?? 0,
        uploadedAtUtc: dto.uploadedAtUtc
    };
}
