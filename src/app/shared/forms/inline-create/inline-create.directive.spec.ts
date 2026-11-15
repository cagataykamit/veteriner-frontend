import { Component, inject, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { Select, SelectModule } from 'primeng/select';
import { InlineCreateOptionComponent } from './inline-create-option.component';
import { type InlineCreateConfig, InlineCreateDirective } from './inline-create.directive';

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, SelectModule, InlineCreateDirective, InlineCreateOptionComponent],
    template: `
        <form [formGroup]="form">
            <p-select inputId="cat" formControlName="categoryId" [options]="options()" optionLabel="label" optionValue="value" [filter]="true" [appInlineCreate]="config()">
                <ng-template #emptyfilter><app-inline-create-option /></ng-template>
                <ng-template #empty><app-inline-create-option emptyText="Henüz kategori yok." /></ng-template>
            </p-select>
        </form>
    `
})
class HostComponent {
    readonly form = inject(FormBuilder).nonNullable.group({ categoryId: '' });
    readonly options = signal([{ value: 'c1', label: 'İlaç' }]);
    readonly created: string[] = [];
    readonly config = signal<InlineCreateConfig>({
        canCreate: true,
        create: (name) => {
            this.created.push(name);
            this.options.update((o) => [...o, { value: 'c2', label: name }]);

            return of('c2');
        }
    });
}

describe('InlineCreateDirective (O1)', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let select: Select;
    let inline: InlineCreateDirective;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.autoDetectChanges();
        select = fixture.debugElement.query(By.directive(Select)).injector.get(Select);
        inline = fixture.debugElement.query(By.directive(Select)).injector.get(InlineCreateDirective);
    });

    const typeFilter = async (text: string) => {
        select.show();
        await fixture.whenStable();
        const filter = document.querySelector<HTMLInputElement>('.p-select-overlay input')!;

        filter.value = text;
        filter.dispatchEvent(new Event('input', { bubbles: true }));
        await fixture.whenStable();
    };

    afterEach(() => select.hide());

    it('aranan yoksa "+ ‘Mama’ ekle" çıkar; tıklayınca kayıt oluşur ve seçilir', async () => {
        await typeFilter('Mama');

        const button = document.querySelector<HTMLButtonElement>('[data-testid=inline-create-add]')!;

        expect(button.textContent).toContain('‘Mama’ ekle');
        button.click();
        await fixture.whenStable();

        expect(host.created).toEqual(['Mama']);
        expect(host.form.controls.categoryId.value).toBe('c2');
        expect(host.form.controls.categoryId.dirty).toBe(true);
    });

    it('filtre kutusunda sonuç yokken Enter ekler', async () => {
        await typeFilter('Mama');

        document.querySelector<HTMLInputElement>('.p-select-overlay input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        await fixture.whenStable();

        expect(host.created).toEqual(['Mama']);
    });

    it('yetkisiz kullanıcıya "Eklemek için yöneticinize başvurun." yazar', async () => {
        host.config.set({ canCreate: false, create: () => of('x') });
        await typeFilter('Mama');

        expect(document.querySelector('[data-testid=inline-create-add]')).toBeNull();
        expect(document.querySelector('[data-testid=inline-create]')!.textContent).toContain('Eklemek için yöneticinize başvurun.');
    });

    it('ekleme bu akışta anlamsızsa yetki cümlesi yerine nedeni yazar', async () => {
        host.config.set({ canCreate: false, unavailableReason: 'Önce mal kabulle stoğa girin.' });
        await typeFilter('Mama');

        expect(document.querySelector('[data-testid=inline-create]')!.textContent).toContain('Önce mal kabulle stoğa girin.');
        expect(document.querySelector('[data-testid=inline-create]')!.textContent).not.toContain('yöneticinize');
    });

    it('çok alanlı kayıtta diyalog açılır, yazılan ad taşınır', async () => {
        const opened: string[] = [];

        host.config.set({ canCreate: true, openDialog: (name) => opened.push(name) });
        await fixture.whenStable();
        inline.query.set('Kuduz aşısı');
        inline.createFromQuery();

        expect(opened).toEqual(['Kuduz aşısı']);
    });

    it('sunucu hatasında Türkçe mesaj seçicide kalır, seçim değişmez', async () => {
        host.config.set({ canCreate: true, create: () => throwError(() => new Error('x')) });
        await fixture.whenStable();
        inline.query.set('Mama');
        inline.createFromQuery();

        expect(inline.error()).toBeTruthy();
        expect(host.form.controls.categoryId.value).toBe('');
    });
});
