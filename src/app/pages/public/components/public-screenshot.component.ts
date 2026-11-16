import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { PUBLIC_SCREENSHOT_CROPS, type PublicScreenshotCrop, type PublicScreenshotCropKey } from '@/app/features/public/utils/public-screenshot-crops.utils';
import { PUBLIC_SCREENSHOTS, publicScreenshotSrc, type PublicScreenshotKey } from '@/app/features/public/utils/public-screenshots.utils';

/**
 * Gerçek ürün ekran görüntüsü (WEB-005) ya da onun bir parçası (yakın çekim). Çerçeve tanıtım sitesi stilindedir (kalın açık
 * kenar, yuvarlak köşe, yumuşak gölge; `public-site.scss`). Açık ve koyu tema görselleri ayrı; yalnız etkin temanınki görünür ve
 * tembel yüklenir. `width`/`height` CLS için.
 *
 * Yakın çekim (`crop`) yeni görsel dosyası gerektirmez: aynı WebP kutunun içinde büyütülüp kaydırılır. `phoneCrop` telefon
 * genişliğinde (640 px altı) büyük görüntünün yerine geçen dar parçadır; aynı ekran görüntüsünden olmalıdır. `sticker` köşeye
 * yapışık, hafif eğik not biçimidir. Altyazı isteğe bağlı.
 */
@Component({
    selector: 'app-public-screenshot',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <figure class="public-shot m-0" [class.public-shot--crop]="cropped()" [class.public-shot--sticker]="sticker()" [style]="cropVars()">
            <div class="public-shot-box">
                <img
                    class="public-shot-img public-shot-img--light"
                    [src]="lightSrc()"
                    [alt]="def().alt"
                    [attr.width]="def().width"
                    [attr.height]="def().height"
                    [attr.loading]="eager() ? 'eager' : 'lazy'"
                    [attr.fetchpriority]="eager() ? 'high' : null"
                    decoding="async"
                />
                <img
                    class="public-shot-img public-shot-img--dark"
                    [src]="darkSrc()"
                    [alt]="def().alt"
                    [attr.width]="def().width"
                    [attr.height]="def().height"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            @if (caption()) {
                <figcaption class="public-shot-caption">{{ caption() }}</figcaption>
            }
        </figure>
    `
})
export class PublicScreenshotComponent {
    /** Tam ekran görüntüsü; `crop` verilirse onun ekranı kullanılır. */
    readonly shot = input<PublicScreenshotKey>('bugun');
    readonly crop = input<PublicScreenshotCropKey | null>(null);
    readonly phoneCrop = input<PublicScreenshotCropKey | null>(null);
    readonly sticker = input<boolean>(false);
    /** İlk ekrandaki (kahraman) görsel: tembel yükleme yok, yüksek öncelik. */
    readonly eager = input<boolean>(false);
    readonly caption = input<string>('');

    private readonly area = computed<PublicScreenshotCrop | null>(() => {
        const key = this.crop();

        return key ? PUBLIC_SCREENSHOT_CROPS[key] : null;
    });

    readonly def = computed(() => PUBLIC_SCREENSHOTS[this.area()?.shot ?? this.shot()]);
    readonly lightSrc = computed(() => publicScreenshotSrc(this.def(), 'light'));
    readonly darkSrc = computed(() => publicScreenshotSrc(this.def(), 'dark'));
    readonly cropped = computed(() => this.area() !== null || this.phoneCrop() !== null);

    /** Kutunun oranı ve görselin kutu içindeki yeri; `-p` ekli eşler telefon genişliğinde geçerlidir. */
    readonly cropVars = computed<Record<string, string>>(() => {
        if (!this.cropped()) {
            return {};
        }

        const def = this.def();
        const full: PublicScreenshotCrop = { shot: this.area()?.shot ?? this.shot(), x: 0, y: 0, w: def.width, h: def.height };
        const place = (area: PublicScreenshotCrop, suffix: string): Record<string, string> => ({
            ['--shot-ratio' + suffix]: `${area.w} / ${area.h}`,
            ['--shot-w' + suffix]: `${(def.width / area.w) * 100}%`,
            ['--shot-x' + suffix]: `${(-area.x / area.w) * 100}%`,
            ['--shot-y' + suffix]: `${(-area.y / area.h) * 100}%`
        });
        const phoneKey = this.phoneCrop();

        return { ...place(this.area() ?? full, ''), ...(phoneKey ? place(PUBLIC_SCREENSHOT_CROPS[phoneKey], '-p') : {}) };
    });
}
