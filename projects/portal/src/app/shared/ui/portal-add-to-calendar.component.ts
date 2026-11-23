import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Observable } from 'rxjs';

/** İndirilen takvim dosyasının adı (sözleşme `APPOINTMENT_OWNER_LINK_API_CONTRACT.md` §8.2 ile aynı). */
export const PORTAL_CALENDAR_FILE_NAME = 'randevu.ics';

/** Tarayıcıya dosyayı kaydettirir (geçici nesne adresi, tıklamadan sonra bırakılır). */
export function savePortalCalendarFile(blob: Blob, fileName = PORTAL_CALENDAR_FILE_NAME): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

/**
 * "Takvime ekle" (TIER-020): tek küçük düğme; açılınca Google Takvim bağlantısı ve .ics dosyası (PO-02: kartta iki tam genişlik
 * düğme yer kaplıyordu). Etkinlik verisi ve dosya backend'de üretilir (tek yer); burada yalnız bağlantı açılır ve dosya kaydedilir.
 */
@Component({
    selector: 'portal-add-to-calendar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-calendar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0 0.5rem;
        }
        .portal-calendar-toggle {
            padding-inline: 0;
            text-decoration: none;
        }
        .portal-calendar i {
            margin-inline-end: 0.375rem;
        }
        .portal-calendar .portal-calendar-chevron {
            margin-inline: 0.375rem 0;
        }
        .portal-calendar-options {
            display: flex;
            flex-wrap: wrap;
            gap: 0 0.75rem;
        }
    `,
    template: `
        <div class="portal-calendar" data-testid="add-to-calendar">
            <button type="button" class="portal-link-button portal-calendar-toggle" [attr.aria-expanded]="open()" (click)="open.set(!open())" data-testid="calendar-toggle">
                <i class="fa-regular fa-calendar-plus" aria-hidden="true"></i>Takvime ekle<i class="fa-solid fa-chevron-down portal-calendar-chevron" [class.fa-rotate-180]="open()" aria-hidden="true"></i>
            </button>
            @if (open()) {
                <div class="portal-calendar-options" role="group" aria-label="Takvime ekle">
                    <a class="portal-link-button" [href]="googleUrl()" target="_blank" rel="noopener noreferrer" data-testid="calendar-google">Google Takvim</a>
                    <button type="button" class="portal-link-button" [disabled]="downloading()" (click)="download()" data-testid="calendar-ics">
                        @if (downloading()) {<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>}Takvim dosyası (.ics)
                    </button>
                </div>
            }
        </div>
        @if (error()) {
            <p class="portal-field-error" role="alert">Takvim dosyası alınamadı. Lütfen tekrar deneyin.</p>
        }
    `
})
export class PortalAddToCalendar {
    /** Backend'in ürettiği Google Takvim "etkinlik oluştur" adresi. */
    readonly googleUrl = input.required<string>();
    /** .ics dosyasını getiren istek (kimliksiz bağlantıda token gövdede, oturumda yetkili GET). */
    readonly ics = input.required<() => Observable<Blob>>();

    readonly open = signal(false);
    readonly downloading = signal(false);
    readonly error = signal(false);

    download(): void {
        if (this.downloading()) {
            return;
        }

        this.error.set(false);
        this.downloading.set(true);
        this.ics()().subscribe({
            next: (blob) => {
                this.downloading.set(false);
                savePortalCalendarFile(blob);
            },
            error: () => {
                this.downloading.set(false);
                this.error.set(true);
            }
        });
    }
}
