import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';

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
 * "Takvime ekle" (TIER-020): Google Takvim bağlantısı ve .ics dosyası. Etkinlik verisi ve dosya backend'de üretilir
 * (tek yer); burada yalnız bağlantı açılır ve dosya kaydedilir.
 */
@Component({
    selector: 'portal-add-to-calendar',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-calendar {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .portal-calendar .p-button {
            flex: 1 1 12rem;
            min-height: var(--portal-touch);
            justify-content: center;
        }
    `,
    template: `
        <div class="portal-calendar" role="group" aria-label="Takvime ekle" data-testid="add-to-calendar">
            <a pButton severity="secondary" [outlined]="true" [href]="googleUrl()" target="_blank" rel="noopener noreferrer" data-testid="calendar-google">
                <i class="p-button-icon fa-regular fa-calendar-plus" aria-hidden="true"></i>Google Takvim'e ekle
            </a>
            <button pButton type="button" severity="secondary" [outlined]="true" [disabled]="downloading()" (click)="download()" data-testid="calendar-ics">
                @if (downloading()) {<i class="p-button-icon fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>} @else {<i class="p-button-icon fa-solid fa-download" aria-hidden="true"></i>}Takvim dosyası (.ics)
            </button>
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
