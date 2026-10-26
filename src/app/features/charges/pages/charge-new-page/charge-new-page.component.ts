import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { startWith, type Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { EXAMINATIONS_READ_CLAIM, PAYMENTS_CREATE_CLAIM, VISITS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ChargeTaxFieldsComponent } from '@/app/features/charges/components/charge-tax-fields.component';
import { ChargesService } from '@/app/features/charges/services/charges.service';
import { CHARGE_DESCRIPTION_MAX_LENGTH, CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS, CHARGE_UNIT_PRICE_MAX, CHARGE_UNIT_PRICE_MAX_DECIMALS, chargeNumberValidator, computeChargeAmount } from '@/app/features/charges/utils/charge-amount.utils';
import type { ChargeLineKind } from '@/app/features/charges/utils/charge-tax.utils';
import { prefillPetFromRoute } from '@/app/shared/panel/examination-create-route-context.utils';
import { ExaminationsService } from '@/app/features/examinations/services/examinations.service';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { VisitsService } from '@/app/features/visits/services/visits.service';
import type { TodayItemVm } from '@/app/features/visits/models/visit-vm.model';
import { trimClientIdControlValue, type SelectOption } from '@/app/shared/forms/client-pet-selection.utils';
import { PetSearchComponent } from '@/app/features/pets/components/pet-search.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { ClientSearchComponent } from '@/app/features/clients/components/client-search.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatUtcIsoAsLocalDateTimeDisplay, formatUtcIsoAsLocalTimeDisplay, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';
import { formatMoney } from '@/app/shared/utils/money.utils';

@Component({
    selector: 'app-charge-new-page',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, ButtonModule, SelectModule, ClientSearchComponent, PetSearchComponent, AppPageHeaderComponent, ChargeTaxFieldsComponent],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <app-page-header categoryLink="/panel/charges" categoryLinkLabel="Ücret listesine dön" title="Yeni Ücret" description="Müşteriye ücret satırı ekleyin. Ücret ödeme sayılmaz." />

        <div class="card">
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mt-0 mb-4" role="status">İşletme salt okunur moddadır; kayıt oluşturulamaz.</p>
            }
            @if (loadError()) {
                <p class="text-red-500 mt-0 mb-4" role="alert">{{ loadError() }}</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit(canCollectPayment)">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <label for="chargeClient" class="block text-sm font-medium text-muted-color mb-2">Müşteri *</label>
                        <app-client-search inputId="chargeClient" formControlName="clientId" />
                        @if (form.controls.clientId.invalid && form.controls.clientId.touched) {
                            <small class="text-red-500">Listeden bir müşteri seçin.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <label for="chargePet" class="block text-sm font-medium text-muted-color mb-2">Hasta</label>
                        <app-pet-search inputId="chargePet" formControlName="petId" [clientId]="form.controls.clientId.value" />
                    </div>
                    @if (canLinkVisit) {
                        <div class="col-span-12 md:col-span-6">
                            <label for="chargeVisit" class="block text-sm font-medium text-muted-color mb-2">Geliş (bugün)</label>
                            <p-select
                                inputId="chargeVisit"
                                formControlName="visitId"
                                [options]="visitOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="visitOptions().length ? 'Bağlanacak geliş (isteğe bağlı)' : 'Bu müşteri için bugün geliş yok'"
                                [showClear]="true"
                                class="w-full"
                            />
                        </div>
                    }
                    @if (canLinkExamination) {
                        <div class="col-span-12 md:col-span-6">
                            <label for="chargeExam" class="block text-sm font-medium text-muted-color mb-2">Muayene</label>
                            <p-select
                                inputId="chargeExam"
                                formControlName="examinationId"
                                [options]="examinationOptions()"
                                optionLabel="label"
                                optionValue="value"
                                [placeholder]="examinationOptions().length ? 'Bağlanacak muayene (isteğe bağlı)' : 'Bağlanabilir muayene yok'"
                                [filter]="true"
                                filterPlaceholder="Ara…"
                                filterBy="label"
                                [showClear]="true"
                                class="w-full"
                                [loading]="loadingExaminations()"
                            />
                        </div>
                    }
                    <div class="col-span-12">
                        <label for="chargeDescription" class="block text-sm font-medium text-muted-color mb-2">Açıklama *</label>
                        <input id="chargeDescription" type="text" class="w-full p-inputtext p-component" formControlName="description" [attr.maxlength]="descriptionMaxLength" placeholder="Örn. Genel muayene, mama satışı" />
                        @if (form.controls.description.invalid && form.controls.description.touched) {
                            <small class="text-red-500">Açıklama zorunludur (en fazla {{ descriptionMaxLength }} karakter).</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-4">
                        <label for="chargeQuantity" class="block text-sm font-medium text-muted-color mb-2">Miktar *</label>
                        <input id="chargeQuantity" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="quantity" />
                        @if (form.controls.quantity.invalid && form.controls.quantity.touched) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ quantityDecimals }} ondalıklı ve {{ quantityMax }} üstünde olmayan bir miktar girin.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-4">
                        <label for="chargeUnitPrice" class="block text-sm font-medium text-muted-color mb-2">Birim fiyat (TRY) *</label>
                        <input id="chargeUnitPrice" type="number" step="any" min="0" class="w-full p-inputtext p-component" formControlName="unitPrice" />
                        @if (form.controls.unitPrice.invalid && form.controls.unitPrice.touched) {
                            <small class="text-red-500">0'dan büyük, en fazla {{ unitPriceDecimals }} ondalıklı ve {{ unitPriceMax }} üstünde olmayan bir fiyat girin.</small>
                        }
                    </div>
                    <div class="col-span-12 md:col-span-4">
                        <span class="block text-sm font-medium text-muted-color mb-2">Tutar</span>
                        <div class="p-inputtext p-component w-full font-semibold" aria-live="polite">{{ amountDisplay() }}</div>
                        @if (amountRoundsToZero()) {
                            <small class="text-red-500">Tutar sıfıra yuvarlanıyor; miktar veya birim fiyatı artırın.</small>
                        }
                    </div>
                    <app-charge-tax-fields [lineKind]="form.controls.lineKind" [vatRate]="form.controls.vatRate" idPrefix="charge" />
                </div>

                @if (submitError()) {
                    <p class="text-red-500 mt-4 mb-0" role="alert">{{ submitError() }}</p>
                }

                <div class="flex flex-wrap gap-2 mt-4">
                    <p-button
                        type="submit"
                        [label]="canCollectPayment ? 'Kaydet ve ödemeyi şimdi al' : copy.buttonSave"
                        [icon]="canCollectPayment ? 'pi pi-wallet' : 'pi pi-check'"
                        [loading]="submitting()"
                        [disabled]="form.invalid || amountPreview() === null || submitting() || ro.mutationBlocked()"
                    />
                    @if (canCollectPayment) {
                        <p-button type="button" [label]="copy.buttonSave" icon="pi pi-check" severity="secondary" (onClick)="onSubmit(false)" [disabled]="form.invalid || amountPreview() === null || submitting() || ro.mutationBlocked()" />
                    }
                    <p-button type="button" [label]="copy.buttonCancel" icon="pi pi-times" severity="secondary" (onClick)="goList()" [disabled]="submitting()" />
                </div>
            </form>
        </div>
    `
})
export class ChargeNewPageComponent implements OnInit {
    readonly copy = PANEL_COPY;
    protected readonly descriptionMaxLength = CHARGE_DESCRIPTION_MAX_LENGTH;
    protected readonly quantityMax = CHARGE_QUANTITY_MAX;
    protected readonly quantityDecimals = CHARGE_QUANTITY_MAX_DECIMALS;
    protected readonly unitPriceMax = CHARGE_UNIT_PRICE_MAX;
    protected readonly unitPriceDecimals = CHARGE_UNIT_PRICE_MAX_DECIMALS;

    private readonly fb = inject(FormBuilder);
    private readonly chargesService = inject(ChargesService);
    private readonly examinationsService = inject(ExaminationsService);
    private readonly visitsService = inject(VisitsService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    /** Ücret kaydından sonra ödeme formuna geçilebilir (B-03); yoksa kayıt liste ekranına döner. */
    readonly canCollectPayment = this.auth.hasOperationClaim(PAYMENTS_CREATE_CLAIM);
    readonly canLinkVisit = this.auth.hasOperationClaim(VISITS_READ_CLAIM);
    readonly canLinkExamination = this.auth.hasOperationClaim(EXAMINATIONS_READ_CLAIM);

    /** Form başına bir kez üretilir; hata sonrası yeniden denemede de aynı kalır (ikinci ücret oluşmaz). */
    private readonly requestId = crypto.randomUUID();

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly loadError = signal<string | null>(null);
    readonly loadingExaminations = signal(false);
    readonly examinationOptions = signal<SelectOption[]>([]);
    private examinationsSub?: Subscription;
    private readonly todayItems = signal<TodayItemVm[]>([]);
    /** "Bugün" listesinin tarihi (yyyy-MM-dd); önceki günden süren gelişler bağlanabilir geliş sayılmaz. */
    private readonly todayDate = signal('');
    private visitPresetId = this.route.snapshot.queryParamMap.get('visitId')?.trim() || null;
    private examinationPresetId = this.route.snapshot.queryParamMap.get('examinationId')?.trim() || null;
    /** Adresten gelen müşteri/hayvan ön seçimleri uygulandı; sonraki değişiklikler kullanıcıdan gelir. */
    private presetsSettled = false;

    readonly form = this.fb.nonNullable.group({
        clientId: ['', Validators.required],
        petId: [''],
        visitId: [''],
        examinationId: [''],
        description: ['', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(CHARGE_DESCRIPTION_MAX_LENGTH)]],
        quantity: [1 as number | null, [Validators.required, chargeNumberValidator(CHARGE_QUANTITY_MAX, CHARGE_QUANTITY_MAX_DECIMALS)]],
        unitPrice: [null as number | null, [Validators.required, chargeNumberValidator(CHARGE_UNIT_PRICE_MAX, CHARGE_UNIT_PRICE_MAX_DECIMALS)]],
        lineKind: ['Service' as ChargeLineKind],
        vatRate: [null as number | null]
    });

    private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
        initialValue: this.form.getRawValue()
    });

    readonly amountPreview = computed(() => computeChargeAmount(this.formValue().quantity ?? null, this.formValue().unitPrice ?? null));
    readonly amountDisplay = computed(() => formatMoney(this.amountPreview(), 'TRY'));
    /** Alanlar tek tek geçerli ama çarpım sıfıra yuvarlanıyor (ör. 0,001 × 1). */
    readonly amountRoundsToZero = computed(() => {
        const { quantity, unitPrice } = this.formValue(); // önce oku: sinyal bağımlılığı kısa devreyle kaybolmasın

        return quantity != null && unitPrice != null && this.form.controls.quantity.valid && this.form.controls.unitPrice.valid && this.amountPreview() === null;
    });

    /** Seçili müşterinin bugünkü (yanlış işaretlenmemiş) gelişleri; hayvan seçiliyse yalnız o hayvanın. */
    readonly visitOptions = computed<SelectOption[]>(() => {
        const { clientId, petId } = this.formValue();
        const cid = trimClientIdControlValue(clientId);
        const pid = trimClientIdControlValue(petId);

        return this.todayItems()
            .filter((i) => i.visitId && !i.isVoided && this.arrivedToday(i) && i.clientId === cid && (!pid || i.petId === pid))
            .map((i) => ({
                value: i.visitId as string,
                label: `${i.petName} — ${formatUtcIsoAsLocalTimeDisplay(i.arrivedAtUtc)} gelişi`
            }));
    });

    ngOnInit(): void {
        if (this.canLinkVisit) {
            this.visitsService.getToday().subscribe({
                next: (t) => {
                    this.todayDate.set(t.date);
                    this.todayItems.set(t.items);
                    this.applyVisitPreset();
                },
                error: () => this.todayItems.set([])
            });
        }

        this.form.controls.clientId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((clientId) => {
            this.form.patchValue({ petId: '', visitId: '', examinationId: '' }, { emitEvent: false });
            this.examinationOptions.set([]);
            this.dropExaminationPresetIfSettled();
            const id = trimClientIdControlValue(clientId);

            this.form.updateValueAndValidity();
            this.loadExaminations(id);
        });
        this.form.controls.petId.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((petId) => {
            this.form.patchValue({ visitId: '', examinationId: '' }, { emitEvent: false });
            this.dropExaminationPresetIfSettled();
            this.form.updateValueAndValidity();
            this.loadExaminations(trimClientIdControlValue(this.form.controls.clientId.value), trimClientIdControlValue(petId));
        });
        // Abonelikler kurulduktan sonra: query'den gelen müşteri ön seçimi değişiklik akışını tetiklemeli.
        const query = this.route.snapshot.queryParamMap;
        const preset = query.get('clientId')?.trim();
        const petPreset = query.get('petId')?.trim();

        if (!prefillPetFromRoute(query, this.form.controls.clientId, this.form.controls.petId) && preset) {
            this.form.controls.clientId.setValue(preset);

            // Geliş/muayene bağlamıyla gelen hayvan: yardımcı (başka bağlam var diye) atlar, burada seçilir.
            if (petPreset) {
                this.form.controls.petId.setValue(petPreset);
            }
        }

        this.presetsSettled = true;
        this.applyVisitPreset();
    }

    /** Adres ön ayarları yerleştikten sonra müşteri/hayvan değişirse bekleyen muayene ön ayarı geçersizdir. */
    private dropExaminationPresetIfSettled(): void {
        if (this.presetsSettled) {
            this.examinationPresetId = null;
        }
    }

    private arrivedToday(item: TodayItemVm): boolean {
        return !!item.arrivedAtUtc && toIstanbulDateInputValue(item.arrivedAtUtc) === this.todayDate();
    }

    /** Ödeme ekranından gelen `visitId`: geliş bugünün listesindeyse hayvan ve geliş önceden seçilir (bir kez). */
    private applyVisitPreset(): void {
        const visitId = this.visitPresetId;
        const item = visitId ? this.todayItems().find((i) => i.visitId === visitId && this.arrivedToday(i)) : undefined;

        if (!item || item.clientId !== trimClientIdControlValue(this.form.controls.clientId.value)) {
            return;
        }

        this.visitPresetId = null;

        // Hayvan zaten adresten seçiliyse yeniden atanmaz: muayene listesi ve seçimi sıfırlanmasın.
        if (trimClientIdControlValue(this.form.controls.petId.value) !== item.petId) {
            this.form.controls.petId.setValue(item.petId);
        }

        this.form.controls.visitId.setValue(item.visitId as string, { emitEvent: false });
    }

    /**
     * Muayene ekranından gelen `examinationId`: muayene yüklenen seçeneklerdeyse önceden seçilir. Ön ayar, adres ön seçimleri
     * (müşteri, sonra hayvan) peş peşe liste yüklediği için her yüklemede yeniden uygulanır; kullanıcı değişikliğinde düşer.
     */
    private applyExaminationPreset(): void {
        const examinationId = this.examinationPresetId;

        if (!examinationId || !this.examinationOptions().some((o) => o.value === examinationId)) {
            return;
        }

        this.form.controls.examinationId.setValue(examinationId, { emitEvent: false });
    }

    goList(): void {
        const clientId = trimClientIdControlValue(this.form.controls.clientId.value);

        void this.router.navigate(['/panel/charges'], { queryParams: clientId ? { clientId } : {} });
    }

    onSubmit(thenCollectPayment = false): void {
        if (this.submitting() || this.ro.mutationBlocked()) {
            return;
        }

        this.submitError.set(null);

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const v = this.form.getRawValue();

        if (v.quantity == null || v.unitPrice == null || this.amountPreview() === null) {
            return;
        }

        this.submitting.set(true);
        this.chargesService
            .createCharge({
                clientId: v.clientId,
                petId: v.petId,
                visitId: v.visitId,
                examinationId: v.examinationId,
                description: v.description,
                quantity: v.quantity,
                unitPrice: v.unitPrice,
                requestId: this.requestId,
                lineKind: v.lineKind,
                vatRate: v.vatRate
            })
            .subscribe({
                next: (r) => {
                    // Başarıda düğme kilitli kalır (sayfadan çıkılır); aynı requestId ile tekrar kayıt zaten oluşmaz.
                    const { id: chargeId, clientId, visitId, examinationId } = r.charge;

                    if (thenCollectPayment) {
                        void this.router.navigate(['/panel/payments/new'], {
                            queryParams: { clientId, chargeId, ...(visitId ? { visitId } : {}), ...(examinationId ? { examinationId } : {}) }
                        });

                        return;
                    }

                    void this.router.navigate(['/panel/charges'], { queryParams: { clientId } });
                },
                error: (e: Error) => {
                    this.submitting.set(false);
                    this.submitError.set(e.message ?? 'Ücret kaydedilemedi.');
                }
            });
    }

    /**
     * Müşteri veya hasta her değiştiğinde önceki istek iptal edilir; böylece geç gelen eski yanıt
     * (ör. adresten birlikte dolumda önce giden "yalnız müşteri" isteği) güncel listeyi ezemez.
     */
    private loadExaminations(clientId: string, petId = ''): void {
        this.examinationsSub?.unsubscribe();

        if (!this.canLinkExamination || !clientId) {
            this.loadingExaminations.set(false);

            return;
        }

        this.loadingExaminations.set(true);
        this.examinationsSub = this.examinationsService
            .getExaminations({ page: 1, pageSize: 50, clientId, petId: petId || undefined })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (r) => {
                    this.examinationOptions.set(
                        r.items.map((e) => ({
                            value: e.id,
                            label: `${formatUtcIsoAsLocalDateTimeDisplay(e.examinedAtUtc)} — ${e.petName} — ${e.visitReason}`
                        }))
                    );
                    this.loadingExaminations.set(false);
                    this.applyExaminationPreset();
                },
                error: () => {
                    this.examinationOptions.set([]);
                    this.loadingExaminations.set(false);
                }
            });
    }
}
