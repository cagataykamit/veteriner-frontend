import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TODAY_ROUTE } from '@/app/core/routing/panel-navigation';
import { ExampleClinicSummaryComponent } from '@/app/features/example-clinic/components/example-clinic-summary.component';
import { exampleClinicDeactivatedProducts, exampleClinicOtherRecords, exampleClinicSummaryShortText } from '@/app/features/example-clinic/data/example-clinic.mapper';
import type { ExampleClinicDataCountsDto, ExampleClinicLoadSummaryDto, ExampleClinicStatusDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import { ExampleClinicError, ExampleClinicService } from '@/app/features/example-clinic/services/example-clinic.service';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Abonelik sayfasında "Örnek Veteriner Kliniği" kartı (ADR-002): boş başlayan deneme kiracısı örnek kliniği sonradan yükler
 * (TRIAL-002); örnek verisi olan kiracı onu kalıcı olarak temizler (`EXAMPLE_CLINIC_API_CONTRACT.md` §10). Kart açılışta
 * durumu okur; durum okunamazsa yalnız yükleme eylemi kalır ve 409 (dolu kurum / deneme dışı) yanıtında düğme gizlenir.
 */
@Component({
    selector: 'app-example-clinic-load-card',
    standalone: true,
    imports: [ButtonModule, DialogModule, RouterLink, ExampleClinicSummaryComponent],
    // Gösterilecek bir şey yoksa ızgarada boş satır (aralık) bırakmasın.
    host: { '[class.hidden]': '!visible()' },
    template: `
        @if (visible()) {
            <div class="card mb-0" data-testid="example-clinic-load-card">
                <h5 class="mt-0 mb-3">Örnek Veteriner Kliniği</h5>
                @if (cleared(); as c) {
                    <p class="text-sm text-muted-color mt-0 mb-3" data-testid="example-clinic-cleared">Örnek veriler kalıcı olarak silindi. Kurumunuz kendi verilerinizle çalışmaya hazır.</p>
                    <app-example-clinic-summary [summary]="c" [note]="false" />
                    @if (deactivatedProducts(c) > 0) {
                        <p class="text-sm text-muted-color mt-3 mb-0">{{ deactivatedProducts(c) }} örnek ürün kendi kayıtlarınızda kullanıldığı için silinmedi, pasife alındı.</p>
                    }
                } @else if (summary(); as s) {
                    <p class="text-sm text-muted-color mt-0 mb-3" data-testid="example-clinic-loaded">Örnek klinik yüklendi. Bugün ekranında randevuları ve bekleyen işleri görebilirsiniz.</p>
                    <app-example-clinic-summary [summary]="s" />
                    <div class="mt-3">
                        <a [routerLink]="todayRoute" class="no-underline">
                            <p-button type="button" label="Bugün'e git" icon="pi pi-calendar" severity="secondary" />
                        </a>
                    </div>
                } @else if (exampleData(); as counts) {
                    <p class="text-sm text-muted-color mt-0 mb-3" data-testid="example-clinic-present">
                        Kurumunuzda örnek klinik verisi var. Kendi verilerinizle çalışmaya hazır olduğunuzda örnek veriyi tek seferde temizleyebilirsiniz; kendi eklediğiniz müşteri, hasta ve ürünler etkilenmez.
                    </p>
                    <app-example-clinic-summary [summary]="counts" />
                    <div class="mt-3 flex flex-wrap gap-2">
                        <a [routerLink]="todayRoute" class="no-underline">
                            <p-button type="button" label="Bugün'e git" icon="pi pi-calendar" severity="secondary" />
                        </a>
                        <p-button type="button" label="Örnek veriyi temizle" icon="pi pi-trash" severity="danger" [outlined]="true" (onClick)="openClearConfirm()" data-testid="example-clinic-clear-button" />
                    </div>
                } @else {
                    <p class="text-sm text-muted-color mt-0 mb-3">
                        Boş klinikle başladıysanız örnek müşteri, hasta, randevu, muayene, aşı, ödeme ve stok kayıtlarıyla dolu bir klinik yükleyip ürünü ilk dakikadan deneyebilirsiniz. Veriler tamamen sentetiktir, gerçek müşteri verisi içermez ve
                        "ÖRNEK" olarak işaretlidir. Yalnız henüz müşteri ya da hasta kaydı olmayan kuruma yüklenir.
                    </p>
                    @if (!blocked()) {
                        <p-button type="button" label="Örnek Veteriner Kliniğini yükle" icon="pi pi-download" [loading]="loading()" [disabled]="loading()" (onClick)="load()" data-testid="example-clinic-load-button" />
                    }
                    @if (error()) {
                        <p class="text-sm mt-3 mb-0" [class.text-red-500]="!blocked()" [class.text-muted-color]="blocked()" role="alert" data-testid="example-clinic-error">{{ error() }}</p>
                    }
                }
            </div>

            <p-dialog header="Örnek veriyi kalıcı olarak sil" [modal]="true" [dismissableMask]="!clearing()" [closable]="!clearing()" [style]="{ width: 'min(560px, 95vw)' }" [(visible)]="clearConfirmVisible">
                @if (exampleData(); as counts) {
                    <p class="mt-0 mb-3">Aşağıdaki örnek kayıtlar ve bunlara bağlı her şey kalıcı olarak silinecek. <strong>Bu işlem geri alınamaz.</strong></p>
                    <app-example-clinic-summary [summary]="counts" [note]="false" />
                    <ul class="text-sm text-muted-color mt-3 mb-0 pl-5 list-disc" data-testid="example-clinic-clear-notes">
                        <li>Örnek müşteri ve hastalara sonradan eklediğiniz muayene, ödeme, randevu gibi kayıtlar da silinir.</li>
                        @if (otherRecords(counts) > 0) {
                            <li>Bunlara bağlı {{ otherRecords(counts) }} kayıt daha (ziyaret, reçete, görüntüleme, yatış vb.) silinir.</li>
                        }
                        @if (deactivatedProducts(counts) > 0) {
                            <li data-testid="example-clinic-clear-deactivated">{{ deactivatedProducts(counts) }} örnek ürün kendi kayıtlarınızda kullanıldığı için silinmez, pasife alınır.</li>
                        }
                        <li>Kendi eklediğiniz müşteri, hasta ve ürünler etkilenmez.</li>
                    </ul>
                    @if (clearError()) {
                        <p class="text-red-500 mt-3 mb-0" role="alert" data-testid="example-clinic-clear-error">{{ clearError() }}</p>
                    }
                }
                <ng-template pTemplate="footer">
                    <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="clearConfirmVisible.set(false)" [disabled]="clearing()" />
                    <p-button type="button" label="Kalıcı olarak sil" icon="pi pi-trash" severity="danger" [loading]="clearing()" [disabled]="clearing()" (onClick)="clear()" data-testid="example-clinic-clear-confirm" />
                </ng-template>
            </p-dialog>
        }
    `
})
export class ExampleClinicLoadCardComponent {
    /** Özet `canManageSubscription` + JWT `Subscriptions.Manage`. */
    readonly canManage = input(false);
    /** Yükleme yalnız aktif deneme (Trialing) aboneliğinde çalışır (sözleşme §1). */
    readonly trialing = input(false);
    /** Salt okunur/iptal kiracıda yazma kapalı: durum okunmaz, temizlik sunulmaz (sözleşme §10). */
    readonly writable = input(true);

    readonly loading = signal(false);
    readonly summary = signal<ExampleClinicLoadSummaryDto | null>(null);
    readonly error = signal<string | null>(null);
    /** 409: kurum dolu ya da deneme dışı — düğme gizlenir, açıklama kalır. */
    readonly blocked = signal(false);

    readonly status = signal<ExampleClinicStatusDto | null>(null);
    readonly cleared = signal<ExampleClinicDataCountsDto | null>(null);
    readonly clearConfirmVisible = signal(false);
    readonly clearing = signal(false);
    readonly clearError = signal<string | null>(null);

    /** Temizlenecek örnek veri varsa sayıları (durum sorgusu). */
    readonly exampleData = computed(() => {
        const status = this.status();

        return status?.hasExampleData ? status.counts : null;
    });

    readonly visible = computed(() => this.canManage() && (this.trialing() || this.exampleData() !== null || this.cleared() !== null));
    readonly todayRoute = TODAY_ROUTE;
    readonly deactivatedProducts = exampleClinicDeactivatedProducts;
    readonly otherRecords = exampleClinicOtherRecords;

    private readonly exampleClinic = inject(ExampleClinicService);
    private readonly messageService = inject(MessageService);

    constructor() {
        effect(() => {
            if (this.canManage() && this.writable()) {
                untracked(() => this.refreshStatus());
            }
        });
    }

    load(): void {
        if (this.loading() || this.blocked()) {
            return;
        }

        this.loading.set(true);
        this.error.set(null);
        this.exampleClinic.load().subscribe({
            next: (s) => {
                this.loading.set(false);
                this.summary.set(s);
                this.refreshStatus();
                addTracedToast(this.messageService, 'ExampleClinicLoadCard', '/panel/settings/subscription', {
                    severity: 'success',
                    summary: 'Örnek Veteriner Kliniği yüklendi',
                    detail: exampleClinicSummaryShortText(s),
                    life: 6000
                });
            },
            error: (e: unknown) => {
                this.loading.set(false);
                this.error.set(e instanceof Error ? e.message : 'Örnek klinik yüklenemedi.');
                this.blocked.set(e instanceof ExampleClinicError && e.isBlocking);
            }
        });
    }

    openClearConfirm(): void {
        this.clearError.set(null);
        this.clearConfirmVisible.set(true);
    }

    clear(): void {
        if (this.clearing()) {
            return;
        }

        this.clearing.set(true);
        this.clearError.set(null);
        this.exampleClinic.clear().subscribe({
            next: (counts) => {
                this.clearing.set(false);
                this.clearConfirmVisible.set(false);
                this.summary.set(null);
                this.status.set(null);
                this.cleared.set(counts);
                addTracedToast(this.messageService, 'ExampleClinicLoadCard', '/panel/settings/subscription', {
                    severity: 'success',
                    summary: 'Örnek veriler silindi',
                    detail: exampleClinicSummaryShortText(counts),
                    life: 6000
                });
            },
            error: (e: unknown) => {
                this.clearing.set(false);

                if (e instanceof ExampleClinicError && e.isNotLoaded) {
                    // Başka sekmede/oturumda zaten silinmiş: diyalog kapanır, kart güncel duruma döner.
                    this.clearConfirmVisible.set(false);
                    this.refreshStatus();
                    addTracedToast(this.messageService, 'ExampleClinicLoadCard', '/panel/settings/subscription', { severity: 'info', summary: 'Örnek veri yok', detail: e.message, life: 5000 });

                    return;
                }

                this.clearError.set(e instanceof Error ? e.message : 'Örnek veri temizlenemedi.');
            }
        });
    }

    /** Durum okunamazsa (yetki/ağ) kart yalnız yükleme eylemiyle kalır; hata gösterilmez. */
    private refreshStatus(): void {
        this.exampleClinic.getStatus().subscribe({
            next: (status) => this.status.set(status),
            error: () => this.status.set(null)
        });
    }
}
