import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { debounceTime, of, Subject, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { isSlug } from '@/app/features/clinic-site/builder/site-checks';
import { WFieldComponent, WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';
import type { ClinicSiteAddressAvailabilityDto } from '@/app/features/clinic-site/models/clinic-site.model';

const REASON_TEXT: Readonly<Record<string, string>> = {
    Invalid: 'Yalnız küçük harf, rakam ve tek tire; 3–60 karakter.',
    Reserved: 'Bu sözcük ayrılmış, kullanılamaz.',
    Taken: 'Bu adres kullanılıyor.'
};

/** Site adresi (K10): yazdıkça uygunluğu sorar, "Adresi değiştir" ile yazar. Alan adı yok; herkes `vetinity.com/k/{adres}` altında (K6). */
@Component({
    selector: 'app-site-address',
    standalone: true,
    imports: [WFieldComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <app-w-field label="Sayfa adresi" [claimCheck]="false" [value]="value()" hint="vetinity.com/k/ sonrası." [error]="formatError()" (valueChange)="changed($event)" />
        @if (dirty()) {
            <div class="state" role="status">
                @if (checking()) {
                    <span class="hint"><i class="pi pi-spin pi-spinner" aria-hidden="true"></i> Denetleniyor</span>
                } @else if (availability(); as result) {
                    @if (result.isAvailable) {
                        <span class="good"><i class="pi pi-check" aria-hidden="true"></i> Bu adres uygun.</span>
                    } @else {
                        <span class="taken"><i class="pi pi-times" aria-hidden="true"></i> {{ reasonText(result) }}</span>
                    }
                }
            </div>
            <div class="row">
                <button type="button" class="wbtn main small" [disabled]="!canSave()" (click)="save()">Adresi değiştir</button>
                <button type="button" class="wbtn ghost small" (click)="reset()">Vazgeç</button>
            </div>
            @if (store.isPublished()) {
                <p class="hint">Eski adres yeni adrese yönlenir ve başkasına verilmez; paylaştığınız bağlantı ve QR çalışmaya devam eder.</p>
            }
        }
        @if (saved()) {
            <p class="ok" role="status"><i class="pi pi-check" aria-hidden="true"></i><span>Adres değişti. @if (store.isPublished()) {Eski bağlantınız yeni adrese yönlenir.}</span></p>
        }
        @if (error(); as message) {
            <p class="bad-note" role="alert"><i class="pi pi-times-circle" aria-hidden="true"></i><span>{{ message }}</span></p>
        }
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            :host {
                display: grid;
                gap: 8px;
            }

            .state {
                font-size: 13px;
            }

            .good {
                color: var(--w-ok-ink);
            }

            .taken {
                color: var(--w-bad);
            }

            .state .pi {
                font-size: 12px;
            }

            .row {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }
        `
    ]
})
export class SiteAddressComponent {
    protected readonly store = inject(SiteBuilderStore);
    private readonly checks = new Subject<string>();

    /** Yazılmamışsa kayıtlı adres görünür. */
    private readonly typed = signal<string | null>(null);
    protected readonly value = computed(() => this.typed() ?? this.store.slug());
    protected readonly dirty = computed(() => this.typed() !== null && this.typed() !== this.store.slug());
    protected readonly checking = signal(false);
    protected readonly availability = signal<ClinicSiteAddressAvailabilityDto | null>(null);
    protected readonly saved = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly formatError = computed(() => (this.dirty() && !isSlug(this.value()) ? REASON_TEXT['Invalid'] : null));
    protected readonly canSave = computed(() => this.dirty() && !this.checking() && !!this.availability()?.isAvailable && !this.store.actionBusy() && this.store.canWrite());

    constructor() {
        this.checks
            .pipe(
                debounceTime(350),
                switchMap((slug) => this.store.checkAddress(slug).pipe(catchError(() => of(null)))),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe((result) => {
                this.availability.set(result);
                this.checking.set(false);

                if (!result) this.error.set('Adres denetlenemedi; bağlantınızı kontrol edin.');
            });
    }

    protected reasonText(result: ClinicSiteAddressAvailabilityDto): string {
        return REASON_TEXT[result.reason ?? 'Invalid'] ?? REASON_TEXT['Invalid'];
    }

    protected changed(text: string): void {
        const slug = text.trim().toLocaleLowerCase('tr');

        this.typed.set(slug);
        this.saved.set(false);
        this.error.set(null);
        this.availability.set(null);

        if (this.dirty() && isSlug(slug)) {
            this.checking.set(true);
            this.checks.next(slug);
        } else {
            this.checking.set(false);
        }
    }

    protected reset(): void {
        this.typed.set(null);
        this.availability.set(null);
        this.error.set(null);
    }

    protected async save(): Promise<void> {
        const slug = this.typed();

        if (!slug) return;

        if (await this.store.changeAddress(slug)) {
            this.typed.set(null);
            this.availability.set(null);
            this.saved.set(true);
        } else {
            this.error.set(this.store.actionError());
        }
    }
}
