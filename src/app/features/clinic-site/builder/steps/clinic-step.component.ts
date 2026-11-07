import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { cleanLinkInput, isEmail, phoneError } from '@/app/features/clinic-site/builder/site-checks';
import { SiteBuilderStore } from '@/app/features/clinic-site/builder/site-builder.store';
import { SiteHoursEditorComponent } from '@/app/features/clinic-site/builder/hours-editor.component';
import { WFieldComponent, WImageComponent, WIZARD_STYLES } from '@/app/features/clinic-site/builder/wizard-kit';

/** 1. adım: klinik bilgileri. Ad, adres, iletişim ve saatler klinik kaydındadır (K8), kalan alanlar site taslağında. */
@Component({
    selector: 'app-clinic-step',
    standalone: true,
    imports: [WFieldComponent, WImageComponent, SiteHoursEditorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @let r = record();
        @let c = clinic();
        <section class="group">
            <h3 class="group-title">Klinik kaydı</h3>
            <p class="note"><i class="pi pi-info-circle" aria-hidden="true"></i><span>Bu bilgiler klinik kaydınızdan gelir. Burada değiştirince klinik kaydınız da değişir; panel, online randevu ve portal yeni hâlini gösterir. Geri al bu alanlara uygulanmaz.</span></p>
            <app-w-field label="Klinik adı" [claimCheck]="false" [value]="r.name" [error]="r.name.trim() ? null : 'Klinik adı gerekli.'" (valueChange)="store.setRecord({ name: $event })" />
            <div class="two">
                <app-w-field label="Telefon" type="tel" autocomplete="off" [claimCheck]="false" [value]="r.phone" [error]="phone()" (valueChange)="store.setRecord({ phone: $event })" />
                <app-w-field label="E-posta" type="email" [claimCheck]="false" [value]="r.email" [error]="r.email.trim() && !email() ? 'Geçerli bir e-posta yazın.' : null" (valueChange)="store.setRecord({ email: $event })" />
            </div>
            <app-w-field label="Adres" [rows]="2" [claimCheck]="false" [value]="r.address" (valueChange)="store.setRecord({ address: $event })" />
            <div class="two">
                <app-w-field label="İlçe" [claimCheck]="false" [value]="r.district" (valueChange)="store.setRecord({ district: $event })" />
                <app-w-field label="İl" [claimCheck]="false" [value]="r.city" (valueChange)="store.setRecord({ city: $event })" />
            </div>
            <app-site-hours-editor [days]="r.workingDays" (daysChange)="store.setRecord({ workingDays: $event })" />
            @if (store.recordError(); as message) {
                <p class="bad-note" role="alert"><i class="pi pi-times-circle" aria-hidden="true"></i><span>{{ message }}</span></p>
            }
            @if (store.recordDirty()) {
                <div class="save-row">
                    <button type="button" class="wbtn main" [disabled]="store.recordSaving() || !recordValid()" (click)="store.saveRecord()">
                        @if (store.recordSaving()) {
                            <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
                        }
                        Klinik kaydına yaz
                    </button>
                    <span class="hint">Klinik kaydına henüz yazılmadı. Sonraki adıma geçince de yazılır.</span>
                </div>
            } @else if (store.recordSavedAt()) {
                <p class="ok" role="status"><i class="pi pi-check" aria-hidden="true"></i><span>Klinik kaydınız güncellendi. Yayındaki sitede de yeniden yayın gerekmeden görünür.</span></p>
            }
        </section>

        <section class="group">
            <h3 class="group-title">Marka</h3>
            <div>
                <p class="mini">Logo</p>
                <app-w-image label="Logo yükle" [reference]="c.logo" [contain]="true" [maxSide]="1024" emptyText="Logonuzu buraya sürükleyin. Renginden palet önerebiliriz." (referenceChange)="store.patchClinic({ logo: $event })" />
            </div>
            <app-w-field label="Slogan" [value]="c.slogan" hint="Kısa bir cümle. Boşsa görünmez." (valueChange)="store.patchClinic({ slogan: $event }, 'clinic.slogan')" />
            <app-w-field label="Kısa tanıtım" [rows]="3" [limit]="200" [value]="c.intro" (valueChange)="store.patchClinic({ intro: $event }, 'clinic.intro')" />
        </section>

        <section class="group">
            <h3 class="group-title">Bağlantılar</h3>
            <div class="two">
                <app-w-field label="WhatsApp" type="tel" [claimCheck]="false" [value]="c.whatsapp" (valueChange)="store.patchClinic({ whatsapp: $event }, 'clinic.whatsapp')" />
                <app-w-field label="Web sitesi" hint="Varsa mevcut siteniz." [claimCheck]="false" [value]="c.website" (valueChange)="setLink('website', $event)" />
            </div>
            <app-w-field label="Google Maps bağlantısı" placeholder="https://maps.google.com/..." [claimCheck]="false" hint="Boşsa adresten bağlantı üretilir. Sitede sade bir konum çizimi görünür; gerçek harita gömülmez." [value]="c.mapUrl" (valueChange)="setLink('mapUrl', $event)" />
            <div class="two">
                <app-w-field label="Instagram" placeholder="kullaniciadi" [claimCheck]="false" [value]="c.instagram" (valueChange)="setLink('instagram', $event)" />
                <app-w-field label="Facebook" [claimCheck]="false" [value]="c.facebook" (valueChange)="setLink('facebook', $event)" />
            </div>
        </section>
    `,
    styles: [
        ...WIZARD_STYLES,
        `
            .note {
                display: flex;
                gap: 10px;
                padding: 12px 14px;
                border-radius: 10px;
                background: var(--w-soft);
                font-size: 13px;
                line-height: 1.45;
            }

            .note .pi {
                margin-top: 2px;
                font-size: 13px;
            }

            .mini {
                margin-bottom: 6px;
                font-size: 13px;
                font-weight: 600;
            }

            .save-row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 10px;
            }
        `
    ]
})
export class ClinicStepComponent {
    protected readonly store = inject(SiteBuilderStore);

    protected readonly record = this.store.record;
    protected readonly clinic = computed(() => this.store.stored().content.clinic);
    protected readonly phone = computed(() => (this.record().phone.trim() ? phoneError(this.record().phone) : 'Telefon gerekli.'));
    protected readonly email = computed(() => isEmail(this.record().email));
    protected readonly recordValid = computed(() => !!this.record().name.trim() && (!this.record().email.trim() || this.email()));

    protected setLink(key: 'website' | 'mapUrl' | 'instagram' | 'facebook', value: string): void {
        this.store.patchClinic({ [key]: cleanLinkInput(value) }, `clinic.${key}`);
    }
}
