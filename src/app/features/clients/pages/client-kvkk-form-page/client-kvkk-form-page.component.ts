import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClientsService } from '@/app/features/clients/services/clients.service';
import { KvkkFormDocumentComponent } from '@/app/features/kvkk/components/kvkk-form-document.component';
import type { KvkkFormTemplateVm } from '@/app/features/kvkk/models/kvkk-form-template.model';
import { KvkkFormTemplateService } from '@/app/features/kvkk/services/kvkk-form-template.service';
import { KVKK_FORM_DEFAULT_TEXT_WARNING, KVKK_TEMPLATE_KINDS, kvkkFormDate, parseKvkkTemplateKind, printKvkkForm } from '@/app/features/kvkk/utils/kvkk-form.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

/**
 * Müşteri kartından "KVKK formu yazdır" (ADR-021 karar 1) ve "Aydınlatma metni yazdır" (ADR-024): aktif kliniğin ilgili şablonu müşteri adı ve
 * bugünün tarihiyle doldurulur, A4 dikey yazdırılır. Tür rota verisinden (`kvkkKind`) gelir. Şablon hâlâ taslak varsayılan metinse yazdırmadan
 * önce uyarı gösterilir. Açık rıza formu kâğıtta kalır; sonuç müşteri kartında "Rıza durumunu işaretle" ile kaydedilir.
 */
@Component({
    selector: 'app-client-kvkk-form-page',
    standalone: true,
    imports: [RouterLink, ButtonModule, AppPageHeaderComponent, AppLoadingStateComponent, AppErrorStateComponent, KvkkFormDocumentComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        @if (loading()) {
            <app-loading-state [message]="info.documentTitle + ' hazırlanıyor…'" />
        } @else if (error()) {
            <div class="card">
                <app-error-state [detail]="error()!" (retry)="load()" />
            </div>
        } @else if (template(); as t) {
            <div class="kvkk-screen-only">
                <app-page-header [categoryLink]="['/panel/clients', clientId]" categoryLinkLabel="Müşteri kartına dön" [title]="info.documentTitle" [description]="clientName() + ' · ' + date">
                    <button pButton actions type="button" (click)="print()" data-testid="kvkk-print"><i class="p-button-icon pi pi-print"></i>Yazdır</button>
                </app-page-header>
                @if (t.isDefault) {
                    <p class="m-0 mb-4 flex flex-wrap items-center gap-2 rounded-border border border-amber-300 dark:border-amber-700 px-3 py-2 text-sm font-medium text-amber-800 dark:text-amber-300" role="alert" data-testid="kvkk-default-warning">
                        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i>{{ defaultWarning }}
                        @if (canEditTemplate) {
                            <a routerLink="/panel/settings/kvkk-form" [queryParams]="editQueryParams" class="text-primary no-underline">Ayarlar'da metni düzenle</a>
                        } @else {
                            <span class="font-normal">Metni klinik yöneticisi Ayarlar'dan değiştirir.</span>
                        }
                    </p>
                }
            </div>
            <app-kvkk-form-document [template]="t.text" [kind]="kind" [clinicName]="clinicName" [clientName]="clientName()" [date]="date" [textVersion]="t.textVersion" />
        }
    `
})
export class ClientKvkkFormPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly auth = inject(AuthService);
    private readonly clientsService = inject(ClientsService);
    private readonly templates = inject(KvkkFormTemplateService);

    readonly kind = parseKvkkTemplateKind(this.route.snapshot.data?.['kvkkKind']);
    readonly info = KVKK_TEMPLATE_KINDS[this.kind];
    /** Ayarlar sayfası türü `?kind=` ile açar; açık rıza varsayılandır, parametre taşımaz. */
    readonly editQueryParams = this.kind === 'consent' ? null : { kind: this.kind };
    readonly defaultWarning = KVKK_FORM_DEFAULT_TEXT_WARNING;
    readonly canEditTemplate = this.auth.hasOperationClaim(CLINICS_UPDATE_CLAIM);
    readonly clientId = this.route.snapshot.paramMap.get('id') ?? '';
    readonly clinicName = this.auth.getClinicName()?.trim() ?? '';
    readonly date = kvkkFormDate();

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly template = signal<KvkkFormTemplateVm | null>(null);
    readonly clientName = signal('');

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const clinicId = this.auth.getClinicId()?.trim();

        if (!this.clientId || !clinicId) {
            this.error.set(clinicId ? 'Geçersiz müşteri.' : `${this.info.documentTitle} için önce bir klinik seçmelisiniz.`);
            this.loading.set(false);

            return;
        }

        this.loading.set(true);
        this.error.set(null);
        forkJoin({ client: this.clientsService.getClientById(this.clientId), template: this.templates.getTemplate(clinicId, this.kind) }).subscribe({
            next: ({ client, template }) => {
                this.clientName.set(client.fullName);
                this.template.set(template);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message || `${this.info.documentTitle} hazırlanamadı.`);
                this.loading.set(false);
            }
        });
    }

    print(): void {
        printKvkkForm();
    }
}
