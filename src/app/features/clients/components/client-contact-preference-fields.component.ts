import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import type { ClientUpsertFormGroup } from '@/app/entities/client/forms/client-upsert-form.factory';
import { CLIENT_CONTACT_CHANNEL_OPTIONS } from '@/app/entities/client/utils/client-contact-preference.utils';

/** Müşteri yeni/düzenle formunun "İletişim tercihi" bölümü: tercih edilen kanal (yalnız bilgi) ve otomatik hatırlatma istememe. */
@Component({
    selector: 'app-client-contact-preference-fields',
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule, CheckboxModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <fieldset class="border-0 p-0 m-0 grid grid-cols-12 gap-4">
            <legend class="sr-only">İletişim tercihi</legend>
            <div class="col-span-12 md:col-span-6">
                <label for="preferredContactChannel" class="block text-sm font-medium text-muted-color mb-2">Tercih edilen iletişim kanalı</label>
                <p-select inputId="preferredContactChannel" [formControl]="form().controls.preferredContactChannel" [options]="channelOptions" optionLabel="label" optionValue="value" class="w-full" />
                <small class="text-muted-color">Bilgi amaçlıdır; otomatik hatırlatmaların gönderim kanalını değiştirmez.</small>
            </div>
            <!-- Sol alanla aynı iskelet: etiket satırı, seçim yüksekliğinde denetim satırı, açıklama; böylece kutu ve açıklama hizalı kalır. -->
            <div class="col-span-12 md:col-span-6">
                <span class="block text-sm font-medium text-muted-color mb-2">Otomatik hatırlatmalar</span>
                <label for="remindersOptedOut" class="flex items-center gap-2 min-h-[2.3rem] cursor-pointer mb-0">
                    <p-checkbox inputId="remindersOptedOut" [binary]="true" [formControl]="form().controls.remindersOptedOut" />
                    <span class="text-color">Otomatik hatırlatma istemiyor</span>
                </label>
                <small class="text-muted-color">İşaretliyse otomatik aşı ve randevu hatırlatma e-postaları bu müşteriye gönderilmez.</small>
            </div>
        </fieldset>
    `
})
export class ClientContactPreferenceFieldsComponent {
    readonly form = input.required<ClientUpsertFormGroup>();
    protected readonly channelOptions = [...CLIENT_CONTACT_CHANNEL_OPTIONS];
}
