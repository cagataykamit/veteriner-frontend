import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ClinicAddressesService } from '@/app/features/clinic-addresses/services/clinic-addresses.service';
import type { ClinicSiteStateDto } from '@/app/features/clinic-site/models/clinic-site.model';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';

const MIN_GRANT = 1;
const MAX_GRANT = 3;

/**
 * Platform yöneticisi: adres değiştirme hakkı biten kliniğe destek olarak ek hak verir (ADR-045 K10). Adres yazılır, sayı girilir, onaylanır;
 * sonuçta sitenin güncel adresi ve yeni kalan hakkı görünür. Liste ve geçmiş yok, denetim kaydı backend'dedir.
 */
@Component({
    selector: 'app-clinic-addresses-page',
    standalone: true,
    imports: [ReactiveFormsModule, ButtonModule, ConfirmDialogModule, InputTextModule, MessageModule, AppPageHeaderComponent],
    providers: [ConfirmationService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-confirmdialog [style]="{ width: 'min(450px, 95vw)' }" />
        <app-page-header title="Klinik adresleri" description="Yayınlanmış site adresini en çok 3 kez değiştirebilir. Hakkı biten kliniğe buradan ek hak verilir. Yalnız Vetinity platform yöneticisi görür." />

        <div class="card">
            <form [formGroup]="form" (ngSubmit)="confirmGrant()" class="flex flex-col gap-4 w-full md:max-w-md">
                @if (error(); as message) {
                    <p-message severity="error" class="w-full" role="alert" data-testid="ca-error">{{ message }}</p-message>
                }
                @if (result(); as site) {
                    <p-message severity="success" class="w-full" role="status" data-testid="ca-result">vetinity.com/k/{{ site.slug }} için kalan değiştirme hakkı: {{ site.addressChangesRemaining ?? '—' }}.</p-message>
                }
                <div class="flex flex-col gap-1">
                    <label for="caSlug" class="text-sm font-medium text-muted-color">Klinik site adresi</label>
                    <input id="caSlug" pInputText formControlName="slug" autocomplete="off" spellcheck="false" placeholder="cagri-veteriner" class="w-full" data-testid="ca-slug" />
                    <small class="text-muted-color">vetinity.com/k/ sonrası. Güncel ya da eski adres olabilir.</small>
                </div>
                <div class="flex flex-col gap-1">
                    <label for="caCount" class="text-sm font-medium text-muted-color">Ek hak</label>
                    <input id="caCount" pInputText type="number" [min]="minGrant" [max]="maxGrant" step="1" formControlName="additionalChanges" class="w-full" data-testid="ca-count" />
                    @if (form.controls.additionalChanges.invalid && form.controls.additionalChanges.touched) {
                        <small class="text-danger">{{ minGrant }} ile {{ maxGrant }} arasında olmalı.</small>
                    }
                </div>
                <div>
                    <button pButton type="submit" [disabled]="form.invalid || saving()" data-testid="ca-submit"><i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-plus'"></i>Hak ver</button>
                </div>
            </form>
        </div>
    `
})
export class ClinicAddressesPageComponent {
    private readonly service = inject(ClinicAddressesService);
    private readonly confirmation = inject(ConfirmationService);

    readonly minGrant = MIN_GRANT;
    readonly maxGrant = MAX_GRANT;
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);
    readonly result = signal<ClinicSiteStateDto | null>(null);

    readonly form = inject(FormBuilder).nonNullable.group({
        slug: ['', [Validators.required, Validators.pattern(/\S/)]],
        additionalChanges: [MIN_GRANT, [Validators.required, Validators.min(MIN_GRANT), Validators.max(MAX_GRANT), Validators.pattern(/^\d+$/)]]
    });

    confirmGrant(): void {
        if (this.form.invalid || this.saving()) {
            return;
        }

        const { slug, additionalChanges } = this.value();

        this.confirmation.confirm({
            header: 'Ek hak ver',
            message: `vetinity.com/k/${slug} adresine ${additionalChanges} ek değiştirme hakkı verilecek.`,
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Hak ver',
            rejectLabel: 'Vazgeç',
            rejectButtonStyleClass: 'p-button-secondary',
            accept: () => this.grant()
        });
    }

    private grant(): void {
        const { slug, additionalChanges } = this.value();

        this.saving.set(true);
        this.error.set(null);
        this.result.set(null);
        this.service.grantAddressChanges(slug, additionalChanges).subscribe({
            next: (site) => {
                this.saving.set(false);
                this.result.set(site);
            },
            error: (err: unknown) => {
                this.saving.set(false);
                this.error.set(err instanceof Error && err.message ? err.message : 'Hak verilemedi.');
            }
        });
    }

    private value(): { slug: string; additionalChanges: number } {
        const { slug, additionalChanges } = this.form.getRawValue();

        return { slug: slug.trim().toLocaleLowerCase('tr'), additionalChanges: Number(additionalChanges) };
    }
}
