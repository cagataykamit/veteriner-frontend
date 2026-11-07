import { barcodeCameraFailureFromError, barcodeCameraUnavailableReason, normalizeScannedBarcode } from './barcode-scan.utils';

describe('barcode-scan.utils', () => {
    describe('normalizeScannedBarcode', () => {
        it('çizgi barkodu kenar boşluğu atılarak olduğu gibi döndürür', () => {
            expect(normalizeScannedBarcode(' 8690000000001 ', 'ean_13')).toBe('8690000000001');
            expect(normalizeScannedBarcode('ABC-12', 'code_128')).toBe('ABC-12');
        });

        it('GS1 karekoddan GTIN alır; başındaki 0 atılınca EAN-13 olur', () => {
            const karekod = '0108699999999991' + '21SERI123' + '\x1d' + '17271231' + '10LOT42';

            expect(normalizeScannedBarcode(karekod, 'data_matrix')).toBe('8699999999991');
            expect(normalizeScannedBarcode(']d2' + karekod, 'data_matrix')).toBe('8699999999991');
        });

        it('başı 0 olmayan GTIN-14 olduğu gibi kalır; GS1 olmayan karekod değişmez', () => {
            expect(normalizeScannedBarcode('0118699999999998', 'data_matrix')).toBe('18699999999998');
            expect(normalizeScannedBarcode('https://ornek.com/urun', 'qr_code')).toBe('https://ornek.com/urun');
        });

        it('çizgi barkodda 01 ile başlayan değeri GTIN sanmaz', () => {
            expect(normalizeScannedBarcode('0108699999999991', 'code_128')).toBe('0108699999999991');
        });
    });

    describe('kamera erişimi', () => {
        const nav = (getUserMedia?: unknown) => ({ mediaDevices: getUserMedia ? { getUserMedia } : undefined }) as unknown as Navigator;

        it('güvenli olmayan bağlantıda (http) kamera denenmez', () => {
            expect(barcodeCameraUnavailableReason({ isSecureContext: false, navigator: nav(() => null) })).toBe('insecure-context');
        });

        it('getUserMedia yoksa desteklenmiyor; varsa engel yok', () => {
            expect(barcodeCameraUnavailableReason({ isSecureContext: true, navigator: nav() })).toBe('unsupported');
            expect(barcodeCameraUnavailableReason({ isSecureContext: true, navigator: nav(() => null) })).toBeNull();
        });

        it('getUserMedia hatası kullanıcı sebebine çevrilir', () => {
            expect(barcodeCameraFailureFromError(new DOMException('x', 'NotAllowedError'))).toBe('permission-denied');
            expect(barcodeCameraFailureFromError(new DOMException('x', 'NotFoundError'))).toBe('no-camera');
            expect(barcodeCameraFailureFromError(new Error('x'))).toBe('camera-error');
            expect(barcodeCameraFailureFromError('x')).toBe('camera-error');
        });
    });
});
