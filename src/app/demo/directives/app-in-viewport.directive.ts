import {
  Directive,
  ElementRef,
  Renderer2,
  AfterViewInit,
  OnDestroy,
  Input
} from '@angular/core';

@Directive({
  selector: '[appAppInViewport]'
})
export class AppInViewportDirective implements AfterViewInit, OnDestroy {
  @Input() animationClass: string = 'fade-from-bottom';
  
  private observer: IntersectionObserver | null = null;
  private hasAnimated = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    // Add initial animation class
    this.renderer.addClass(this.el.nativeElement, this.animationClass);
    
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.hasAnimated) {
          this.renderer.addClass(this.el.nativeElement, 'show');
          this.hasAnimated = true;
          this.observer?.unobserve(this.el.nativeElement);
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
