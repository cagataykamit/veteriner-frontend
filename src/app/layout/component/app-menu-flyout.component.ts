import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, ElementRef, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuFlyoutService } from '@/app/layout/service/menu-flyout.service';

/** Panelde gösterilen sekme: menü verisinden yetkiye göre süzülmüş hâli. */
export interface MenuFlyoutTab {
    readonly label: string;
    readonly route: string;
    /** Sayaç metni (`menuBadgeLabel`); 0 veya bilinmiyorsa yok. */
    readonly badge?: string | null;
    readonly active: boolean;
}

/** Panelin pencere kenarına en yakın mesafesi. */
const VIEWPORT_MARGIN_PX = 8;
/** Satır ile panel arasındaki boşluk; fare geçişini kapanma gecikmesi karşılar. */
const ANCHOR_GAP_PX = 4;

/**
 * Sekmeli menü satırının alt sayfa paneli (flyout). Kenar çubuğunun `overflow` kırpmasına takılmaması için `body`'ye taşınır
 * ve satırın sağına `position: fixed` ile hizalanır; pencereye sığmazsa yukarı kayar, çok kısa pencerede kendi içinde kaydırılır.
 * Klavye: Aşağı/Yukarı/Home/End gezinir, Escape ve Sol ok kapatıp odağı satıra verir, Tab kapatıp satırdan sonraki öğeye geçer.
 */
@Component({
    selector: 'app-menu-flyout',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'layout-menu-flyout',
        role: 'menu',
        '[id]': 'panelId()',
        '[attr.aria-label]': 'label() + " alt sayfaları"',
        '(pointerenter)': 'onPointer($event, true)',
        '(pointerleave)': 'onPointer($event, false)',
        '(focusout)': 'onFocusOut($event)',
        '(keydown)': 'onKeydown($event)'
    },
    template: `
        @if (heading()) {
            <div class="layout-menu-flyout-heading" role="presentation">{{ label() }}</div>
        }
        @for (tab of tabs(); track tab.route) {
            <a
                role="menuitem"
                class="layout-menu-flyout-item"
                tabindex="-1"
                [routerLink]="tab.route"
                [class.active-route]="tab.active"
                [attr.aria-current]="tab.active ? 'page' : null"
                (click)="selected.emit()"
            >
                <span class="layout-menu-flyout-text">{{ tab.label }}</span>
                @if (tab.badge) {
                    <span class="layout-menuitem-badge">{{ tab.badge }}<span class="sr-only"> bekleyen</span></span>
                }
            </a>
        }
    `
})
export class AppMenuFlyout implements AfterViewInit {
    private readonly host: HTMLElement = inject(ElementRef).nativeElement;
    private readonly flyout = inject(MenuFlyoutService);

    /** Panelin hizalandığı menü satırı (bağlantı); odak kapanınca buraya döner. */
    readonly anchor = input.required<HTMLElement>();
    readonly tabs = input.required<readonly MenuFlyoutTab[]>();
    /** Menü öğesinin adı: ekran okuyucu etiketi ve (başlık açıksa) panel başlığı. */
    readonly label = input.required<string>();
    /** Daraltılmış menüde satır adı görünmediğinden panelin üstünde başlık olarak yazılır. */
    readonly heading = input(false);
    readonly panelId = input.required<string>();
    /** Klavyeyle açıldıysa odak ilk sekmeye geçer. */
    readonly focusFirst = input(false);

    /** Bir sekme seçildi; gezinme `routerLink` ile başlar. */
    readonly selected = output<void>();

    constructor() {
        // Hizası bozulmasın: pencere boyutu değişince ya da menü/sayfa kayınca panel kapanır (panelin kendi kaydırması hariç).
        const close = (event: Event) => {
            if (!(event.target instanceof Node && this.host.contains(event.target))) {
                this.flyout.close();
            }
        };

        window.addEventListener('resize', close);
        document.addEventListener('scroll', close, true);
        inject(DestroyRef).onDestroy(() => {
            window.removeEventListener('resize', close);
            document.removeEventListener('scroll', close, true);
            this.host.remove();
        });
    }

    ngAfterViewInit(): void {
        document.body.appendChild(this.host);
        this.position();

        if (this.focusFirst()) {
            this.focusItem(0);
        }
    }

    /** Sekmeye odaklanır; dizin dışı değerler başa/sona sarar. */
    focusItem(index: number): void {
        const items = this.items();

        items[((index % items.length) + items.length) % items.length]?.focus();
    }

    protected onPointer(event: PointerEvent, entered: boolean): void {
        if (event.pointerType !== 'mouse') {
            return;
        }

        if (entered) {
            this.flyout.cancelClose();
        } else {
            this.flyout.scheduleClose();
        }
    }

    protected onFocusOut(event: FocusEvent): void {
        const next = event.relatedTarget;

        if (next instanceof Node && (this.host.contains(next) || this.anchor().contains(next))) {
            return;
        }

        this.flyout.close();
    }

    protected onKeydown(event: KeyboardEvent): void {
        const items = this.items();
        const current = items.indexOf(document.activeElement as HTMLElement);

        switch (event.key) {
            case 'ArrowDown':
                this.focusItem(current + 1);
                break;
            case 'ArrowUp':
                this.focusItem(current < 0 ? -1 : current - 1);
                break;
            case 'Home':
                this.focusItem(0);
                break;
            case 'End':
                this.focusItem(-1);
                break;
            case ' ':
                (document.activeElement as HTMLElement | null)?.click();
                break;
            case 'Escape':
            case 'ArrowLeft':
                this.returnFocus();
                break;
            case 'Tab':
                // Odak satıra döner; tarayıcının Tab işlemi oradan bir sonraki/önceki öğeye geçer.
                this.returnFocus();

                return;
            default:
                return;
        }

        event.preventDefault();
    }

    /** Önce odak satıra döner (satırın odak işleyicisi paneli yeniden açmaya çalışsa da) sonra panel kapanır. */
    private returnFocus(): void {
        this.anchor().focus();
        this.flyout.close();
    }

    private items(): HTMLElement[] {
        return Array.from(this.host.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    }

    /** Satırın sağına hizalar; alt kenara sığmazsa yukarı, sağ kenara sığmazsa sola kaydırır. */
    private position(): void {
        const anchor = this.anchor().getBoundingClientRect();
        const { offsetWidth: width, offsetHeight: height } = this.host;
        const maxLeft = window.innerWidth - VIEWPORT_MARGIN_PX - width;
        const maxTop = window.innerHeight - VIEWPORT_MARGIN_PX - height;

        this.host.style.left = `${Math.max(VIEWPORT_MARGIN_PX, Math.min(anchor.right + ANCHOR_GAP_PX, maxLeft))}px`;
        this.host.style.top = `${Math.max(VIEWPORT_MARGIN_PX, Math.min(anchor.top, maxTop))}px`;
    }
}
