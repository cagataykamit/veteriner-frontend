import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { type BarcodeDetectorLike, createBarcodeDetector } from '@/app/shared/barcode/barcode-detector.loader';
import { BARCODE_CAMERA_FAILURE_MESSAGES, type BarcodeCameraFailure, barcodeCameraFailureFromError, barcodeCameraUnavailableReason, normalizeScannedBarcode } from '@/app/shared/barcode/barcode-scan.utils';

/** Kareler arası bekleme: telefonda pil ve işlemciyi yormadan okuma için yeterli. */
const SCAN_INTERVAL_MS = 250;

/**
 * Telefon kamerasıyla barkod okutma penceresi (TIER-006). Arka kamera açılır, ilk okunan barkod `detected` ile döner ve pencere
 * kapanır. Kamera açılamazsa (izin reddi, http, kamera yok) sebep yazılır; elle giriş kutusu her durumda pencerede kalır.
 * Paket kuralı burada değil, düğmeyi çizen bileşendedir.
 */
@Component({
    selector: 'app-barcode-camera-dialog',
    standalone: true,
    imports: [DialogModule, ButtonModule, InputTextModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="header()" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(480px, 95vw)' }" [(visible)]="visible" (onShow)="start()" (onHide)="stop()">
            <div class="flex flex-col gap-3">
                @if (failure(); as message) {
                    <p class="m-0 text-sm text-amber-700 dark:text-amber-300" role="alert" data-testid="barcode-camera-failure">{{ message }}</p>
                }
                <div class="relative overflow-hidden rounded-border bg-black aspect-[4/3]" [class.hidden]="failure()">
                    <video #video class="w-full h-full object-cover" muted playsinline autoplay aria-label="Kamera görüntüsü"></video>
                    <div class="absolute inset-x-[12%] top-1/2 -translate-y-1/2 h-1/3 border-2 border-white/80 rounded-border pointer-events-none" aria-hidden="true"></div>
                </div>
                @if (!failure()) {
                    <p class="m-0 text-sm text-muted-color" role="status">{{ scanning() ? 'Barkodu çerçeveye getirin; okununca pencere kapanır.' : 'Kamera açılıyor…' }}</p>
                }
                <form class="flex gap-2" (submit)="submitManual($event)">
                    <label for="barcode-camera-manual" class="sr-only">Barkodu elle yazın</label>
                    <input
                        id="barcode-camera-manual"
                        pInputText
                        type="text"
                        class="flex-1 min-w-0"
                        autocomplete="off"
                        placeholder="Barkodu elle yazın"
                        [value]="manualCode()"
                        (input)="manualCode.set($any($event.target).value)"
                        data-testid="barcode-camera-manual"
                    />
                    <button pButton type="submit" severity="secondary" [disabled]="!manualCode().trim()"><i class="p-button-icon pi pi-search"></i>Bul</button>
                </form>
            </div>
        </p-dialog>
    `
})
export class BarcodeCameraDialogComponent {
    readonly visible = model(false);
    readonly header = input('Barkod okut');
    /** Okunan ya da elle yazılan barkod (kenar boşluğu atılmış). */
    readonly detected = output<string>();

    private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

    protected readonly failure = signal<string | null>(null);
    protected readonly scanning = signal(false);
    protected readonly manualCode = signal('');

    private stream: MediaStream | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    /** Pencere kapanıp açıldığında eski oturumun geç gelen sonucu yok sayılır. */
    private session = 0;

    constructor() {
        inject(DestroyRef).onDestroy(() => this.stop());
    }

    async start(): Promise<void> {
        const session = ++this.session;

        this.failure.set(null);
        this.scanning.set(false);
        this.manualCode.set('');

        const unavailable = barcodeCameraUnavailableReason();

        if (unavailable) {
            this.fail(unavailable);

            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });

            if (session !== this.session) {
                stream.getTracks().forEach((t) => t.stop());

                return;
            }

            this.stream = stream;
        } catch (error) {
            if (session === this.session) {
                this.fail(barcodeCameraFailureFromError(error));
            }

            return;
        }

        let detector: BarcodeDetectorLike;

        try {
            const video = this.video()?.nativeElement;

            if (!video) {
                throw new Error('video');
            }

            video.srcObject = this.stream;
            await video.play();
            detector = await createBarcodeDetector();
        } catch {
            if (session === this.session) {
                this.fail('unsupported');
            }

            return;
        }

        if (session === this.session) {
            this.scanning.set(true);
            this.scheduleScan(detector, session);
        }
    }

    stop(): void {
        this.session++;
        this.scanning.set(false);

        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;
        const video = this.video()?.nativeElement;

        if (video) {
            video.srcObject = null;
        }
    }

    protected submitManual(event: Event): void {
        event.preventDefault();
        const code = this.manualCode().trim();

        if (code) {
            this.finish(code);
        }
    }

    private scheduleScan(detector: BarcodeDetectorLike, session: number): void {
        this.timer = setTimeout(async () => {
            const video = this.video()?.nativeElement;

            try {
                const found = video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA ? await detector.detect(video) : [];
                const hit = found.find((b) => b.rawValue.trim());

                if (hit && session === this.session) {
                    this.finish(normalizeScannedBarcode(hit.rawValue, hit.format));

                    return;
                }
            } catch {
                // Tek kare okunamadı; sonraki karede yeniden denenir.
            }

            if (session === this.session) {
                this.scheduleScan(detector, session);
            }
        }, SCAN_INTERVAL_MS);
    }

    private finish(code: string): void {
        this.stop();
        this.visible.set(false);
        this.detected.emit(code);
    }

    private fail(reason: BarcodeCameraFailure): void {
        this.stop();
        this.failure.set(BARCODE_CAMERA_FAILURE_MESSAGES[reason]);
    }
}
