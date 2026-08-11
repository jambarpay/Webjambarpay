import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, signal, ViewChild, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../design-system/components/empty-state/empty-state.component';
import { FeedbackMessageComponent } from '../../../design-system/components/feedback-message/feedback-message.component';
import { LoadingStateComponent } from '../../../design-system/components/loading-state/loading-state.component';
import { RestaurantPaymentsFacade } from '../../restaurant/application/restaurant-payments.facade';

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorLike;

@Component({
  selector: 'app-seller-portal',
  imports: [EmptyStateComponent, FeedbackMessageComponent, LoadingStateComponent],
  templateUrl: './seller-portal.component.html',
  styleUrls: ['./seller-portal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellerPortalComponent implements OnDestroy {
  private readonly restaurantPayments = inject(RestaurantPaymentsFacade);

  readonly qrPhoneNumber = this.restaurantPayments.qrPhoneNumber;
  readonly qrCodeUrl = this.restaurantPayments.qrCodeUrl;
  readonly qrCodeStatus = this.restaurantPayments.qrCodeStatus;

  readonly feedback = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  readonly scannerOpen = signal(false);
  readonly scanResult = signal('');
  @ViewChild('scannerVideo') private scannerVideo?: ElementRef<HTMLVideoElement>;
  private cameraStream?: MediaStream;
  private detectorTimer?: number;

  async openScanner(): Promise<void> {
    this.scannerOpen.set(true);
    this.scanResult.set('');
    this.feedback.set(null);
    await new Promise<void>(resolve => queueMicrotask(resolve));
    if (!navigator.mediaDevices?.getUserMedia || !this.scannerVideo) {
      this.feedback.set({ type: 'error', message: 'La caméra n’est pas disponible dans ce navigateur.' });
      return;
    }
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      this.scannerVideo.nativeElement.srcObject = this.cameraStream;
      await this.scannerVideo.nativeElement.play();
      this.startDetection();
    } catch {
      this.feedback.set({ type: 'error', message: 'Impossible d’accéder à la caméra. Vérifiez l’autorisation du navigateur.' });
    }
  }

  stopScanner(): void {
    if (this.detectorTimer !== undefined) window.clearTimeout(this.detectorTimer);
    this.detectorTimer = undefined;
    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = undefined;
    this.scannerOpen.set(false);
  }

  ngOnDestroy(): void {
    this.stopScanner();
  }

  private startDetection(): void {
    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!detectorConstructor || !this.scannerVideo) {
      this.feedback.set({ type: 'success', message: 'Scanner actif. Cadrez un QR avec la caméra.' });
      return;
    }
    const detector = new detectorConstructor({ formats: ['qr_code'] });
    const detect = async (): Promise<void> => {
      if (!this.scannerOpen() || !this.scannerVideo) return;
      try {
        const codes = await detector.detect(this.scannerVideo.nativeElement);
        const value = codes[0]?.rawValue?.trim();
        if (value) {
          this.scanResult.set(value);
          this.feedback.set({ type: 'success', message: 'QR détecté. Vérifiez le paiement avant confirmation.' });
          this.stopScanner();
          return;
        }
      } catch {
        this.feedback.set({ type: 'error', message: 'Le QR n’a pas pu être lu.' });
      }
      this.detectorTimer = window.setTimeout(() => void detect(), 250);
    };
    void detect();
  }
}
