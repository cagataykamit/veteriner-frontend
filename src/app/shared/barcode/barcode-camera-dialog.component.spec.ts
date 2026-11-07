import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarcodeCameraDialogComponent } from './barcode-camera-dialog.component';

describe('BarcodeCameraDialogComponent', () => {
    let fixture: ComponentFixture<BarcodeCameraDialogComponent>;
    let cmp: BarcodeCameraDialogComponent;
    let detected: string[];
    const original = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');

    const body = () => document.body;

    const mockGetUserMedia = (impl: () => Promise<MediaStream>) => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(impl) } });

    beforeEach(() => {
        detected = [];
        fixture = TestBed.createComponent(BarcodeCameraDialogComponent);
        cmp = fixture.componentInstance;
        cmp.detected.subscribe((c) => detected.push(c));
        fixture.componentRef.setInput('visible', true);
        fixture.detectChanges();
    });

    afterEach(() => {
        fixture.destroy();

        if (original) {
            Object.defineProperty(navigator, 'mediaDevices', original);
        } else {
            delete (navigator as { mediaDevices?: unknown }).mediaDevices;
        }
    });

    it('kamera izni reddedilince sebebi yazar, elle giriş kutusu kalır ve barkodu döndürür', async () => {
        mockGetUserMedia(() => Promise.reject(new DOMException('reddedildi', 'NotAllowedError')));

        await cmp.start();
        fixture.detectChanges();

        expect(body().querySelector('[data-testid="barcode-camera-failure"]')?.textContent).toContain('Kamera izni verilmedi');
        const input = body().querySelector<HTMLInputElement>('[data-testid="barcode-camera-manual"]')!;

        input.value = ' 8690001 ';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        input.form!.dispatchEvent(new Event('submit', { cancelable: true }));
        fixture.detectChanges();

        expect(detected).toEqual(['8690001']);
        expect(cmp.visible()).toBe(false);
    });

    it('cihazda kamera yoksa ayrı sebep yazar', async () => {
        mockGetUserMedia(() => Promise.reject(new DOMException('yok', 'NotFoundError')));

        await cmp.start();
        fixture.detectChanges();

        expect(body().querySelector('[data-testid="barcode-camera-failure"]')?.textContent).toContain('kamera bulunamadı');
    });

    it('boş elle girişte barkod döndürmez', () => {
        const input = body().querySelector<HTMLInputElement>('[data-testid="barcode-camera-manual"]')!;

        input.form!.dispatchEvent(new Event('submit', { cancelable: true }));

        expect(detected).toEqual([]);
    });
});
