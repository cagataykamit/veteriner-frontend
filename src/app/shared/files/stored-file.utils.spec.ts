import { mapStoredFileDtoToVm, precheckStoredFile, STORED_FILE_MAX_BYTES, STORED_FILE_TYPE_MESSAGE, storedFileProblemMessage } from './stored-file.utils';

describe('stored-file.utils — ön kontrol', () => {
    const file = (name: string, type: string, size = 1000) => ({ name, type, size });

    it('JPEG, PNG, WebP ve PDF kabul edilir (uzantı veya MIME)', () => {
        expect(precheckStoredFile(file('röntgen.JPG', ''))).toBeNull();
        expect(precheckStoredFile(file('foto', 'image/webp'))).toBeNull();
        expect(precheckStoredFile(file('a.png', 'image/png'))).toBeNull();
        expect(precheckStoredFile(file('sonuc.pdf', 'application/pdf'))).toBeNull();
    });

    it('SVG, HTML, video ve DICOM ön kontrolde reddedilir', () => {
        expect(precheckStoredFile(file('x.svg', 'image/svg+xml'))).toBe(STORED_FILE_TYPE_MESSAGE);
        expect(precheckStoredFile(file('x.html', 'text/html'))).toBe(STORED_FILE_TYPE_MESSAGE);
        expect(precheckStoredFile(file('x.mp4', 'video/mp4'))).toBe(STORED_FILE_TYPE_MESSAGE);
        expect(precheckStoredFile(file('x.dcm', 'application/dicom'))).toBe(STORED_FILE_TYPE_MESSAGE);
    });

    it('boyut sınırı (varsayılan 15 MB) ve boş dosya', () => {
        expect(precheckStoredFile(file('a.jpg', 'image/jpeg', STORED_FILE_MAX_BYTES))).toBeNull();
        expect(precheckStoredFile(file('a.jpg', 'image/jpeg', STORED_FILE_MAX_BYTES + 1))).toBe('Dosya en çok 15 MB olabilir.');
        expect(precheckStoredFile(file('a.jpg', 'image/jpeg', 0))).toBe('Dosya boş.');
    });

    it('sunucu hata kodları Türkçe metne çevrilir; bilinmeyen kod null', () => {
        expect(storedFileProblemMessage('Files.UnsupportedType')).toContain('içeriği');
        expect(storedFileProblemMessage('Examinations.Finalized')).toContain('yeni görüntüleme kaydı');
        expect(storedFileProblemMessage('Başka.Kod')).toBeNull();
    });

    it('DTO eşlemesi: PDF türü içerik türünden de anlaşılır', () => {
        const vm = mapStoredFileDtoToVm({ id: 'f1', fileName: ' ', contentType: 'application/pdf', kind: 'X', sizeBytes: 5, uploadedAtUtc: '2026-10-22T10:00:00Z' });

        expect(vm).toEqual({ id: 'f1', fileName: 'dosya', contentType: 'application/pdf', kind: 'Pdf', sizeBytes: 5, uploadedAtUtc: '2026-10-22T10:00:00Z' });
    });
});
