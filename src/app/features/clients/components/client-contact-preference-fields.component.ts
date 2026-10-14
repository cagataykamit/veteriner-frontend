import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import type { ClientUpsertFormGroup } from '@/app/features/clients/forms/client-upsert-form.factory';
import { CLIENT_CONTACT_CHANNEL_OPTIONS } from '@/app/features/clients/utils/client-contact-preference.utils';

/** Müşteri yeni/düzenle formunun "İletişim tercihi" bölümü: tercih edilen kanal (yalnız bilgi) ve otomatik hatırlatma istememe. */
@Component({
    selector: 'app-client-contact-preference-fields',
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule, CheckboxModule],
    template: `
        <fieldset class="border-0 p-0 m-0 grid grid-cols-12 gap-4">
            <legend class="sr-only">İletişim tercihi</legend>
            <div class="col-span-12 md:col-span-6">
                <label for="preferredContactChannel" class="block text-sm font-medium text-muted-color mb-2">Tercih edilen iletişim kanalı</label>
                <p-select
                    inputId="preferredContactChannel"
                    [formControl]="form().controls.preferredContactChannel"
                    [options]="channelOptions"
                    optionLabel="label"
                    optionValue="value"
                    styleClass="w-full"
                />
                <small class="text-muted-color">Bilgi amaçlıdır; otomatik hatırlatmaların gönderim kanalını değiştirmez.</small>
            </div>
            <div class="col-span-12 md:col-span-6 flex flex-col justify-center">
                <div class="flex items-center gap-2">
                    <p-checkbox inputId="remindersOptedOut" [binary]="true" [formControl]="form().controls.remindersOptedOut" />
                    <label for="remindersOptedOut" class="text-sm cursor-pointer mb-0">Otomatik hatırlatma istemiyor</label>
                </div>
                <small class="text-muted-color">İşaretliyse otomatik aşı ve randevu hatırlatma e-postaları bu müşteriye gönderilmez.</small>
            </div>
        </fieldset>
    `
})
export class ClientContactPreferenceFieldsComponent {
    readonly form = input.required<ClientUpsertFormGroup>();
    protected readonly channelOptions = CLIENT_CONTACT_CHANNEL_OPTIONS;
}
