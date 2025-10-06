import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

interface TextMeta {
  key: string;
  leading: string;
  trailing: string;
}

@Directive({
  selector: '[appAutoTranslate]',
  standalone: true
})
export class AutoTranslateDirective implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly translate = inject(TranslateService);

  private readonly textNodes = new WeakMap<Text, TextMeta>();
  private readonly attributeKeys = new WeakMap<Element, Record<string, string>>();
  private readonly translatableAttributes = ['placeholder', 'title', 'aria-label', 'mattooltip'];

  private observer?: MutationObserver;
  private languageSubscription?: Subscription;
  private translationScheduled = false;

  ngAfterViewInit(): void {
    this.scheduleTranslation();
    this.languageSubscription = this.translate.onLangChange.subscribe(() => this.scheduleTranslation());

    this.zone.runOutsideAngular(() => {
      this.observer = new MutationObserver((mutations) => {
        if (!mutations.length) {
          return;
        }
        this.scheduleTranslation();
      });

      this.observer.observe(this.host.nativeElement, {
        childList: true,
        subtree: true,
        characterData: true
      });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.languageSubscription?.unsubscribe();
  }

  private scheduleTranslation(): void {
    if (this.translationScheduled) {
      return;
    }

    this.translationScheduled = true;
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.translationScheduled = false;
        this.applyTranslations();
      });
    });
  }

  private applyTranslations(): void {
    const element = this.host.nativeElement;
    this.translateTextNodes(element);
    this.translateAttributes(element);
  }

  private translateTextNodes(root: HTMLElement): void {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Node) => {
          const parent = node.parentElement;
          if (!parent) {
            return NodeFilter.FILTER_REJECT;
          }

          if (parent.closest('[data-no-translate]')) {
            return NodeFilter.FILTER_REJECT;
          }

          const tagName = parent.tagName;
          if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') {
            return NodeFilter.FILTER_REJECT;
          }

          const trimmed = node.textContent?.trim() ?? '';
          if (!trimmed) {
            return NodeFilter.FILTER_REJECT;
          }

          if (/^[\d\s.,:%+-]+$/.test(trimmed)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      } as unknown as NodeFilter
    );

    let current: Node | null;
    while ((current = walker.nextNode())) {
      const textNode = current as Text;
      let meta = this.textNodes.get(textNode);

      if (!meta) {
        const original = textNode.textContent ?? '';
        const trimmed = original.trim();
        const startIndex = original.indexOf(trimmed);
        const endIndex = startIndex + trimmed.length;

        meta = {
          key: trimmed,
          leading: startIndex > 0 ? original.slice(0, startIndex) : '',
          trailing: endIndex < original.length ? original.slice(endIndex) : ''
        };

        this.textNodes.set(textNode, meta);
      }

      if (!meta.key) {
        continue;
      }

      const translated = this.translate.instant(meta.key);
      const nextValue = `${meta.leading}${translated}${meta.trailing}`;

      if (textNode.textContent !== nextValue) {
        textNode.textContent = nextValue;
      }
    }
  }

  private translateAttributes(root: HTMLElement): void {
    const selector = this.translatableAttributes.map((attr) => `[${attr}]`).join(', ');
    const elements = root.querySelectorAll<HTMLElement>(selector);

    elements.forEach((element) => {
      const stored = this.attributeKeys.get(element) ?? {};
      this.attributeKeys.set(element, stored);

      this.translatableAttributes.forEach((attr) => {
        const value = element.getAttribute(attr);
        if (!value) {
          return;
        }

        const key = stored[attr] ?? value.trim();
        stored[attr] = key;

        const translated = this.translate.instant(key);
        if (attr === 'mattooltip') {
          if (element.getAttribute(attr) !== translated) {
            element.setAttribute(attr, translated);
          }

          if ((element as unknown as { matTooltip?: string }).matTooltip !== undefined) {
            (element as unknown as { matTooltip?: string }).matTooltip = translated;
          }

          return;
        }

        if (element.getAttribute(attr) !== translated) {
          element.setAttribute(attr, translated);
        }
      });
    });
  }
}

