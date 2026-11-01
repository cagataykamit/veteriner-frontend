import { computed, DestroyRef, Directive, ElementRef, inject, OnInit, signal, ViewContainerRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICAL_SNIPPETS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { ClinicalSnippetMenuComponent } from '@/app/entities/clinical-snippet/components/clinical-snippet-menu.component';
import type { ClinicalSnippetDto } from '@/app/entities/clinical-snippet/models/clinical-snippet.model';
import { ClinicalSnippetsService } from '@/app/entities/clinical-snippet/services/clinical-snippets.service';
import { filterSnippets, findSnippetToken, replaceSnippetToken, type SnippetToken } from '@/app/entities/clinical-snippet/utils/clinical-snippet-text.utils';

const MAX_SUGGESTIONS = 20;
const MENU_WIDTH_PX = 352;
const MENU_MAX_HEIGHT_PX = 288;
const VIEWPORT_GAP_PX = 8;

/** Ayna öğeye kopyalanan, metnin satır kırılımını belirleyen stiller (imleç konumu hesabı). */
const MIRROR_STYLES = [
    'box-sizing',
    'width',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'font-style',
    'font-variant',
    'font-weight',
    'font-stretch',
    'font-size',
    'line-height',
    'font-family',
    'text-align',
    'text-transform',
    'text-indent',
    'letter-spacing',
    'word-spacing',
    'tab-size'
] as const;

let nextId = 0;

/** Listenin ekrandaki konumu (`position: fixed`); alta sığmazsa imlecin üstüne açılır (`bottom`). */
export interface ClinicalSnippetMenuPosition {
    left: number;
    top: number | null;
    bottom: number | null;
}

/**
 * Düz `<textarea formControlName>` üzerinde `#` ile metin parçası ekleme (EXAM-011, sözleşme §9). İmleçten geriye `#sorgu`
 * yazılınca aktif parçalar (oturumda bir kez çekilir) kısayol/başlıkta Türkçe duyarsız süzülür ve imlecin altında liste açılır:
 * ↑/↓ seç, Enter/Tab ekle, Esc kapat, tıklama ile ekle. Seçimde `#sorgu` parçanın metniyle değiştirilir, form değeri
 * güncellenir (kirli işaretlenir) ve imleç eklenen metnin sonuna gelir. `ClinicalSnippets.Read` yoksa veya alan kapalıysa
 * hiçbir şey yapmaz. Liste ve "# ile …" ipucu alanın hemen arkasına eklenen `ClinicalSnippetMenuComponent` ile çizilir.
 */
@Directive({
    selector: 'textarea[appClinicalSnippetTrigger]',
    standalone: true,
    host: {
        '[attr.aria-autocomplete]': 'canRead ? "list" : null',
        '[attr.aria-controls]': 'open() ? listboxId : null',
        '[attr.aria-activedescendant]': 'open() ? optionId(activeIndex()) : null',
        '(input)': 'onInput($event)',
        '(keydown)': 'onKeydown($event)',
        '(keyup)': 'onKeyup($event)',
        '(click)': 'evaluate()',
        '(blur)': 'close()',
        '(scroll)': 'reposition()'
    }
})
export class ClinicalSnippetTriggerDirective implements OnInit {
    private readonly ngControl = inject(NgControl, { self: true });
    private readonly textarea = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
    private readonly vcr = inject(ViewContainerRef);
    private readonly snippetsService = inject(ClinicalSnippetsService);
    private readonly destroyRef = inject(DestroyRef);

    readonly canRead = inject(AuthService).hasOperationClaim(CLINICAL_SNIPPETS_READ_CLAIM);
    readonly listboxId = `clinical-snippets-${nextId++}`;

    private readonly snippets = signal<readonly ClinicalSnippetDto[]>([]);
    private readonly token = signal<SnippetToken | null>(null);
    /** Esc ile kapatılan belirtecin başlangıcı; aynı `#` için liste yeniden açılmaz. */
    private dismissedStart: number | null = null;

    readonly activeIndex = signal(0);
    readonly position = signal<ClinicalSnippetMenuPosition>({ left: 0, top: 0, bottom: null });
    readonly suggestions = computed(() => {
        const token = this.token();

        return token ? filterSnippets(this.snippets(), token.query, MAX_SUGGESTIONS) : [];
    });
    readonly open = computed(() => this.suggestions().length > 0);

    ngOnInit(): void {
        if (!this.canRead) {
            return;
        }

        this.vcr.createComponent(ClinicalSnippetMenuComponent).setInput('trigger', this);
        this.snippetsService
            .activeSnippets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (items) => this.snippets.set(items), error: () => this.snippets.set([]) });

        const onScroll = () => this.reposition();

        document.addEventListener('scroll', onScroll, true);
        this.destroyRef.onDestroy(() => document.removeEventListener('scroll', onScroll, true));
    }

    /** İpucu yalnız kullanılabilirken: izin var, en az bir aktif parça var ve alan açık. */
    hintVisible(): boolean {
        return this.snippets().length > 0 && this.enabled();
    }

    optionId(index: number): string {
        return `${this.listboxId}-${index}`;
    }

    onInput(event: Event): void {
        if ((event as InputEvent).isComposing) {
            return;
        }

        this.evaluate();
    }

    onKeydown(event: KeyboardEvent): void {
        if (!this.open() || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) {
            return;
        }

        const count = this.suggestions().length;

        switch (event.key) {
            case 'ArrowDown':
                this.activeIndex.set((this.activeIndex() + 1) % count);
                break;
            case 'ArrowUp':
                this.activeIndex.set((this.activeIndex() - 1 + count) % count);
                break;
            case 'Enter':
            case 'Tab':
                if (event.shiftKey) {
                    return;
                }

                this.pick(this.activeIndex());
                break;
            case 'Escape':
                this.dismissedStart = this.token()?.start ?? null;
                this.token.set(null);
                // İletişim penceresi içindeyse Esc pencereyi kapatmasın.
                event.stopPropagation();
                break;
            default:
                return;
        }

        event.preventDefault();
    }

    /** Yatay imleç hareketi belirteci değiştirebilir; dikey oklar liste açıkken seçimi taşır. */
    onKeyup(event: KeyboardEvent): void {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || (!this.open() && ['ArrowUp', 'ArrowDown'].includes(event.key))) {
            this.evaluate();
        }
    }

    /** İmleçteki belirteci yeniden okur; eşleşme yoksa liste kapalı kalır. */
    evaluate(): void {
        const el = this.textarea;
        const token = this.enabled() && el.selectionStart === el.selectionEnd ? findSnippetToken(el.value, el.selectionStart) : null;

        if (!token) {
            this.dismissedStart = null;
            this.token.set(null);

            return;
        }

        if (token.start === this.dismissedStart) {
            this.token.set(null);

            return;
        }

        this.dismissedStart = null;
        const previous = this.token();

        if (previous?.start !== token.start || previous.query !== token.query) {
            this.activeIndex.set(0);
        }

        this.token.set(token);
        this.reposition();
    }

    /** Seçilen parçanın metnini `#sorgu` yerine yazar. */
    pick(index: number): void {
        const token = this.token();
        const snippet = this.suggestions()[index];
        const control = this.ngControl.control;

        if (!token || !snippet || !control) {
            return;
        }

        const next = replaceSnippetToken(this.textarea.value, token, snippet.body);

        control.setValue(next.text);
        control.markAsDirty();
        this.token.set(null);
        this.textarea.focus();
        this.textarea.setSelectionRange(next.caret, next.caret);
    }

    close(): void {
        this.token.set(null);
    }

    reposition(): void {
        const token = this.token();

        if (token) {
            this.position.set(this.menuPosition(token.start));
        }
    }

    private enabled(): boolean {
        return this.canRead && !this.ngControl.disabled && !this.textarea.readOnly;
    }

    /** `#` karakterinin satırına göre konum; satır alanın görünür kısmı dışındaysa alanın kenarına sabitlenir. */
    private menuPosition(index: number): ClinicalSnippetMenuPosition {
        const rect = this.textarea.getBoundingClientRect();
        const caret = caretOffset(this.textarea, index);
        const lineTop = Math.min(Math.max(rect.top + caret.top - this.textarea.scrollTop, rect.top), rect.bottom - caret.height);
        const lineBottom = lineTop + caret.height;
        const left = Math.max(VIEWPORT_GAP_PX, Math.min(rect.left + caret.left - this.textarea.scrollLeft, window.innerWidth - MENU_WIDTH_PX - VIEWPORT_GAP_PX));

        if (lineBottom + MENU_MAX_HEIGHT_PX > window.innerHeight - VIEWPORT_GAP_PX && lineTop > MENU_MAX_HEIGHT_PX) {
            return { left, top: null, bottom: window.innerHeight - lineTop };
        }

        return { left, top: lineBottom, bottom: null };
    }
}

/** Alanın içindeki `index` konumunun (kenarlık dahil) ofseti: metnin kopyası görünmez bir ayna öğede ölçülür. */
function caretOffset(el: HTMLTextAreaElement, index: number): { top: number; left: number; height: number } {
    const style = getComputedStyle(el);
    const mirror = document.createElement('div');

    for (const name of MIRROR_STYLES) {
        mirror.style.setProperty(name, style.getPropertyValue(name));
    }

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.top = '0';
    mirror.style.left = '-9999px';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    mirror.textContent = el.value.slice(0, index);

    const marker = document.createElement('span');

    marker.textContent = el.value.slice(index) || '.';
    mirror.appendChild(marker);
    document.body.appendChild(mirror);

    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
    const offset = {
        top: marker.offsetTop + (Number.parseFloat(style.borderTopWidth) || 0),
        left: marker.offsetLeft + (Number.parseFloat(style.borderLeftWidth) || 0),
        height: lineHeight
    };

    mirror.remove();

    return offset;
}
