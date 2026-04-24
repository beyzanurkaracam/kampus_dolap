import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../core/api/api.service';
import { TrDatePipe } from '../../shared/pipes/tr-pipes';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, TrDatePipe],
  template: `
    <div class="page">
      <div class="info-banner">
        <span>Mesaj içerikleri gizlilik nedeniyle gösterilmemektedir. Sadece sohbet meta verileri listelenir.</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Alıcı</th>
              <th>Satıcı</th>
              <th>Ürün</th>
              <th>Son Mesaj</th>
              <th>Son Güncelleme</th>
            </tr>
          </thead>
          <tbody>
            @for (chat of chats(); track chat.id) {
              <tr>
                <td>
                  <div class="user-mini">
                    <span class="avatar-mini">{{ chat.buyer?.fullName?.charAt(0) || '?' }}</span>
                    {{ chat.buyer?.fullName || '-' }}
                  </div>
                </td>
                <td>
                  <div class="user-mini">
                    <span class="avatar-mini seller">{{ chat.seller?.fullName?.charAt(0) || '?' }}</span>
                    {{ chat.seller?.fullName || '-' }}
                  </div>
                </td>
                <td>{{ chat.product?.title || '-' }}</td>
                <td>
                  <span class="last-msg">{{ chat.lastMessage ? (chat.lastMessage.length > 40 ? (chat.lastMessage | slice:0:40) + '...' : chat.lastMessage) : 'Mesaj yok' }}</span>
                </td>
                <td>{{ chat.updatedAt | trDate }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-row">Henüz sohbet yok</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { display: flex; flex-direction: column; gap: 20px; }
    .info-banner {
      display: flex; align-items: center; gap: 10px; padding: 14px 20px;
      background: #dbeafe; border: 1px solid #93c5fd; border-radius: 12px;
      font-size: 13px; color: #1e40af;
    }
    .table-container { background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow-x: auto; }
    .data-table {
      width: 100%; border-collapse: collapse;
      th { text-align: left; padding: 14px 20px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      td { padding: 14px 20px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; }
      tbody tr { transition: background 0.15s; &:hover { background: #f8fafc; } &:last-child td { border-bottom: none; } }
    }
    .user-mini { display: flex; align-items: center; gap: 8px; }
    .avatar-mini {
      width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px; color: #fff; flex-shrink: 0;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      &.seller { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    }
    .last-msg { font-size: 13px; color: #64748b; }
    .empty-row { text-align: center; color: #94a3b8; padding: 48px 20px !important; }
  `],
})
export class ChatsComponent implements OnInit {
  chats = signal<any[]>([]);
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.getAllChats().subscribe({
      next: (data) => this.chats.set(data),
      error: () => this.chats.set([]),
    });
  }
}
