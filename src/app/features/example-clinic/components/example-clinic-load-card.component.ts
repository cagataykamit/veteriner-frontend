import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TODAY_ROUTE } from '@/app/core/routing/panel-navigation';
import { ExampleClinicSummaryComponent } from '@/app/features/example-clinic/components/example-clinic-summary.component';
import { exampleClinicSummaryShortText } from '@/app/features/example-clinic/data/example-clinic.mapper';
import type { ExampleClinicLoadSummaryDto } from '@/app/features/example-clinic/models/example-clinic-api.model';
import { ExampleClinicLoadError, ExampleClinicService } from '@/app/features/example-clinic/services/example-clinic.service';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

/**
 * Abonelik sayfasında "Örnek Veteriner Kliniğini yükle" (ADR-002, TRIAL-002): boş başlayan deneme kiracısı sonradan yükler.
 * Kiracıda veri olup olmadığını veren bir uç yok; eylem deneme + `Subscriptions.Manage` koşulunda her zaman gösterilir,
 * 409 (dolu kurum / deneme dışı) yanıtında düğme gizlenip açıklama kalır.
 */
@Component({
    selector: 'app-example-clinic-load-card',
    standalone: true,
    imports: [ButtonModule, RouterLink, ExampleClinicSummaryComponent],
    // Gösterilecek bir şey yoksa ızgarada boş satır (aralık) bırakmasın.
    host: { '[class.hidden]': '!visible()' },
    template: `
        @if (visible()) {
            <div class="card mb-0" data-testid="example-clinic-load-card">
                <h5 class="mt-0 mb-3">Örnek Veteriner Kliniği</h5>
                @if (summary(); as s) {
                    <p class="text-sm text-muted-color mt-0 mb-3" data-testid="example-clinic-loaded">Örnek klinik yüklendi. Bugün ekranında randevuları ve bekleyen işleri görebilirsiniz.</p>
                    <app-example-clinic-summary [summary]="s" />
                    <div class="mt-3">
                        <a [routerLink]="todayRoute" class="no-underline">
                            <p-button type="button" label="Bugün'e git" icon="pi pi-calendar" severity="secondary" />
                        </a>
                    </div>
                } @else {
                    <p class="text-sm text-muted-color mt-0 mb-3">
                        Boş klinikle başladıysanız örnek müşteri, hasta, randevu, muayene, aşı, ödeme ve stok kayıtlarıyla dolu bir klinik yükleyip ürünü ilk dakikadan deneyebilirsiniz. Veriler tamamen sentetiktir, gerçek müşteri verisi içermez ve "ÖRNEK" olarak işaretlidir. Yalnız henüz müşteri ya da hasta
                        kaydı olmayan kuruma yüklenir.
                    </p>
                    @if (!blocked()) {
                        <p-button type="button" label="Örnek Veteriner Kliniğini yükle" icon="pi pi-download" [loading]="loading()" [disabled]="loading()" (onClick)="load()" data-testid="example-clinic-load-button" />
                    }
                    @if (error()) {
                        <p class="text-sm mt-3 mb-0" [class.text-red-500]="!blocked()" [class.text-muted-color]="blocked()" role="alert" data-testid="example-clinic-error">{{ error() }}</p>
                    }
                }
            </div>
        }
    `
})
export class ExampleClinicLoadCardComponent {
    /** Özet `canManageSubscription` + JWT `Subscriptions.Manage`. */
    readonly canManage = input(false);
    /** Yalnız aktif deneme (Trialing) aboneliğinde çalışır (sözleşme §1). */
    readonly trialing = input(false);

    readonly loading = signal(false);
    readonly summary = signal<ExampleClinicLoadSummaryDto | null>(null);
    readonly error = signal<string | null>(null);
    /** 409: kurum dolu ya da deneme dışı — düğme gizlenir, açıklama kalır. */
    readonly blocked = signal(false);

    readonly visible = computed(() => this.canManage() && this.trialing());
    readonly todayRoute = TODAY_ROUTE;

    private readonly exampleClinic = inject(ExampleClinicService);
    private readonly messageService = inject(MessageService);

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
                this.blocked.set(e instanceof ExampleClinicLoadError && e.isBlocking);
            }
        });
    }
}
