import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible()) {
      <div class="dialog-overlay" (click)="onCancel.emit()">
        <div class="dialog-box" (click)="$event.stopPropagation()">
          <div class="dialog-icon">{{ icon() }}</div>
          <h3 class="dialog-title">{{ title() }}</h3>
          <p class="dialog-message">{{ message() }}</p>
          <div class="dialog-actions">
            <button class="btn btn-cancel" (click)="onCancel.emit()">İptal</button>
            <button
              class="btn"
              [class.btn-danger]="type() === 'danger'"
              [class.btn-success]="type() === 'success'"
              [class.btn-primary]="type() === 'primary'"
              (click)="onConfirm.emit()"
            >
              {{ confirmText() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(4px);
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    .dialog-box {
      background: #fff; border-radius: 20px; padding: 32px;
      max-width: 420px; width: 90%; text-align: center;
      box-shadow: 0 24px 48px rgba(0,0,0,0.12);
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    .dialog-icon { font-size: 48px; margin-bottom: 16px; }
    .dialog-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
    .dialog-message { font-size: 14px; color: #64748b; margin: 0 0 28px; line-height: 1.5; }
    .dialog-actions { display: flex; gap: 12px; justify-content: center; }
    .btn {
      padding: 10px 24px; border: none; border-radius: 10px;
      font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;
    }
    .btn-cancel { background: #f1f5f9; color: #475569; &:hover { background: #e2e8f0; } }
    .btn-danger { background: #ef4444; color: #fff; &:hover { background: #dc2626; } }
    .btn-success { background: #22c55e; color: #fff; &:hover { background: #16a34a; } }
    .btn-primary { background: #3b82f6; color: #fff; &:hover { background: #2563eb; } }
  `],
})
export class ConfirmDialogComponent {
  visible = input(false);
  title = input('Onay');
  message = input('Bu işlemi gerçekleştirmek istediğinize emin misiniz?');
  confirmText = input('Onayla');
  icon = input('⚠️');
  type = input<'danger' | 'success' | 'primary'>('danger');
  onConfirm = output<void>();
  onCancel = output<void>();
}
