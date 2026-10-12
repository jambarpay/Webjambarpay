import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationInboxService } from '../../core/notifications/notification-inbox.service';

@Component({
  selector: 'app-notification-inbox',
  imports: [DatePipe, RouterLink],
  providers: [NotificationInboxService],
  templateUrl: './notification-inbox.component.html',
  styleUrls: ['./notification-inbox.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationInboxComponent implements OnInit {
  readonly inbox = inject(NotificationInboxService);
  private readonly element = inject(ElementRef<HTMLElement>);
  readonly opened = signal(false);

  ngOnInit(): void { this.inbox.refresh(0); }

  toggle(): void {
    this.opened.update(value => !value);
    if (this.opened()) this.inbox.refresh(0);
  }

  @HostListener('document:keydown.escape')
  close(): void { this.opened.set(false); }

  @HostListener('document:click', ['$event'])
  closeOutside(event: MouseEvent): void {
    if (event.target instanceof Node && !this.element.nativeElement.contains(event.target)) this.close();
  }
}
