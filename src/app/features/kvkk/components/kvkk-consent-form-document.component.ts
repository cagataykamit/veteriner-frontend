import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { fillKvkkFormTemplate } from '@/app/features/kvkk/utils/kvkk-form.utils';

/**
 * Yazdırılıp müşteriye imzalatılan KVKK açık rıza formu (ADR-021 karar 1): başlıkta klinik adı, şablon metni (yer tutucular doldurulmuş,
 * düz metin; HTML yorumlanmaz), "Kabul ediyorum / Kabul etmiyorum" kutuları ve Veri Sahibi bloğu. Kutular ve imza bloğu şablonun parçası
 * değildir; metin ne olursa olsun basılır (sözleşme §2). Yazdırma yerleşimi `_print.scss` içindeki `.kvkk-form` kuralıyla yapılır.
 */
@Component({
    selector: 'app-kvkk-consent-form-document',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article class="kvkk-form mx-auto max-w-3xl p-6 md:p-8 bg-surface-0 dark:bg-surface-900 border border-surface rounded-border" aria-label="KVKK açık rıza formu">
            @if (clinicName().trim()) {
                <header class="text-center mb-6">
                    <h2 class="m-0 text-xl font-semibold" data-testid="kvkk-form-clinic">{{ clinicName() }}</h2>
                </header>
            }
            <div class="whitespace-pre-wrap break-words leading-relaxed" data-testid="kvkk-form-text">{{ filledText() }}</div>

            <div class="kvkk-form-block flex flex-wrap gap-x-12 gap-y-3 mt-8" data-testid="kvkk-form-choices">
                <span class="inline-flex items-center gap-2"><span class="kvkk-form-box inline-block w-4 h-4 border border-surface-900 dark:border-surface-0" aria-hidden="true"></span>Kabul ediyorum</span>
                <span class="inline-flex items-center gap-2"><span class="kvkk-form-box inline-block w-4 h-4 border border-surface-900 dark:border-surface-0" aria-hidden="true"></span>Kabul etmiyorum</span>
            </div>

            <section class="kvkk-form-block mt-10" aria-label="Veri Sahibi" data-testid="kvkk-form-signature">
                <h3 class="m-0 mb-4 text-base font-semibold">Veri Sahibi</h3>
                <dl class="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-4 gap-y-5 m-0 max-w-md items-end">
                    <dt>Adı Soyadı</dt>
                    <dd class="kvkk-form-line m-0 pb-1 border-b border-surface-900 dark:border-surface-0">{{ clientName() }}</dd>
                    <dt>Tarih</dt>
                    <dd class="kvkk-form-line m-0 pb-1 border-b border-surface-900 dark:border-surface-0">{{ date() }}</dd>
                    <dt>İmza</dt>
                    <dd class="kvkk-form-line m-0 h-12 border-b border-surface-900 dark:border-surface-0"></dd>
                </dl>
            </section>
        </article>
    `
})
export class KvkkConsentFormDocumentComponent {
    /** Ham şablon metni (sunucudan veya Ayarlar'daki düzenleyiciden). */
    readonly template = input.required<string>();
    readonly clinicName = input('');
    readonly clientName = input('');
    /** `dd.MM.yyyy` */
    readonly date = input('');

    readonly filledText = computed(() => fillKvkkFormTemplate(this.template(), { clinicName: this.clinicName(), clientName: this.clientName(), date: this.date() }));
}
