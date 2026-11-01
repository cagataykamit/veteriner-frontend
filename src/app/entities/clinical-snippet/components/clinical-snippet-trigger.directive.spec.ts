import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { ClinicalSnippetDto } from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { ClinicalSnippetsService } from '@/app/entities/clinical-snippet/services/clinical-snippets.service';
import { ClinicalSnippetTriggerDirective } from './clinical-snippet-trigger.directive';

const snippet = (shortcut: string, title: string, body: string): ClinicalSnippetDto => ({
    id: shortcut,
    shortcut,
    title,
    body,
    isActive: true,
    createdAtUtc: '2026-11-01T10:00:00Z',
    updatedAtUtc: null,
    rowVersion: 'AA=='
});

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, ClinicalSnippetTriggerDirective],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <form [formGroup]="form">
            <textarea id="anamnesis" rows="4" formControlName="anamnesis" appClinicalSnippetTrigger></textarea>
        </form>
    `
})
class HostComponent {
    readonly form = new FormGroup({ anamnesis: new FormControl('', { nonNullable: true }) });
}

describe('ClinicalSnippetTriggerDirective', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let claims: Set<string>;
    let activeSnippets: ReturnType<typeof vi.fn>;

    const root = () => fixture.nativeElement as HTMLElement;
    const textarea = () => root().querySelector('textarea') as HTMLTextAreaElement;
    const listbox = () => root().querySelector<HTMLElement>('[data-testid="clinical-snippet-listbox"]');
    const options = () => Array.from(root().querySelectorAll<HTMLElement>('[role="option"]'));
    const hint = () => root().querySelector('[data-testid="clinical-snippet-hint"]');

    async function create(): Promise<void> {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
            providers: [
                { provide: ClinicalSnippetsService, useValue: { activeSnippets } },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c) } }
            ]
        }).compileComponents();
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    }

    function type(value: string, caret = value.length): void {
        const el = textarea();

        el.focus();
        el.value = value;
        el.setSelectionRange(caret, caret);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        fixture.detectChanges();
    }

    function key(name: string): KeyboardEvent {
        const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });

        textarea().dispatchEvent(event);
        fixture.detectChanges();

        return event;
    }

    beforeEach(() => {
        claims = new Set(['ClinicalSnippets.Read']);
        activeSnippets = vi.fn().mockReturnValue(
            of([snippet('kusma', 'Kusma anamnezi', 'Kaç kez kustu?'), snippet('kulak', 'Kulak muayenesi', 'Kulak akıntısı: '), snippet('ishal', 'İshal anamnezi', 'Kaç gündür?')])
        );
    });

    it('izin ve aktif parça varken ipucu görünür; # yazınca süzülmüş liste açılır', async () => {
        await create();
        expect(hint()?.textContent).toContain('# ile metin parçası ekleyin');
        expect(listbox()).toBeNull();

        type('Öykü: #KU');
        expect(listbox()).not.toBeNull();
        expect(options().map((o) => Array.from(o.querySelectorAll('span')).map((s) => s.textContent?.trim()))).toEqual([
            ['#kusma', 'Kusma anamnezi'],
            ['#kulak', 'Kulak muayenesi']
        ]);
        expect(textarea().getAttribute('aria-activedescendant')).toBe(options()[0].id);
        expect(options()[0].getAttribute('aria-selected')).toBe('true');
    });

    it('↓ ve Enter ile seçilen parçanın metni #sorgu yerine eklenir; değer kirlenir, imleç metnin sonunda', async () => {
        await create();
        type('Öykü: #ku devam', 9);

        expect(key('ArrowDown').defaultPrevented).toBe(true);
        expect(textarea().getAttribute('aria-activedescendant')).toBe(options()[1].id);
        expect(key('Enter').defaultPrevented).toBe(true);

        const control = host.form.controls.anamnesis;

        expect(control.value).toBe('Öykü: Kulak akıntısı:  devam');
        expect(control.dirty).toBe(true);
        expect(textarea().value).toBe(control.value);
        expect(textarea().selectionStart).toBe('Öykü: Kulak akıntısı: '.length);
        expect(listbox()).toBeNull();
    });

    it('Tab da ekler; tıklama ile seçim ekler', async () => {
        await create();
        type('#ish');
        key('Tab');
        expect(host.form.controls.anamnesis.value).toBe('Kaç gündür?');

        type('Kaç gündür?\n#');
        expect(options()).toHaveLength(3);
        options()[0].click();
        fixture.detectChanges();
        expect(host.form.controls.anamnesis.value).toBe('Kaç gündür?\nKaç kez kustu?');
    });

    it('Esc kapatır ve aynı # için yeniden açılmaz; eşleşme yoksa veya # bitişik değilse liste kapalı', async () => {
        await create();
        type('#ku');
        expect(key('Escape').defaultPrevented).toBe(true);
        expect(listbox()).toBeNull();
        type('#kus');
        expect(listbox()).toBeNull();
        type('#kus #k');
        expect(listbox()).not.toBeNull();

        type('#zzz');
        expect(listbox()).toBeNull();
        type('C#ku');
        expect(listbox()).toBeNull();
        expect(key('Enter').defaultPrevented).toBe(false);
    });

    it('ClinicalSnippets.Read yoksa hiç çalışmaz (istek yok, ipucu yok, liste yok)', async () => {
        claims = new Set();
        await create();
        type('#ku');
        expect(activeSnippets).not.toHaveBeenCalled();
        expect(hint()).toBeNull();
        expect(listbox()).toBeNull();
        expect(textarea().hasAttribute('aria-autocomplete')).toBe(false);
    });

    it('aktif parça yoksa ipucu görünmez; alan kapalıyken ipucu ve liste yoktur', async () => {
        activeSnippets.mockReturnValue(of([]));
        await create();
        expect(hint()).toBeNull();

        TestBed.resetTestingModule();
        activeSnippets.mockReturnValue(of([snippet('kusma', 'Kusma', 'K')]));
        await create();
        host.form.disable({ emitEvent: false });
        fixture.detectChanges();
        expect(hint()).toBeNull();
        type('#ku');
        expect(listbox()).toBeNull();
    });
});
