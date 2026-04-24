import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { TrDatePipe, TrCurrencyPipe } from '../../shared/pipes/tr-pipes';

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, TrDatePipe, TrCurrencyPipe],
  template: `
    <div class="page">
      <div class="page-toolbar">
        <div class="status-filters">
          <button class="filter-chip" [class.active]="statusFilter === ''" (click)="statusFilter = ''; filter()">Tümü</button>
          <button class="filter-chip" [class.active]="statusFilter === 'pending'" (click)="statusFilter = 'pending'; filter()"> Bekliyor</button>
          <button class="filter-chip" [class.active]="statusFilter === 'accepted'" (click)="statusFilter = 'accepted'; filter()"> Kabul</button>
          <button class="filter-chip" [class.active]="statusFilter === 'rejected'" (click)="statusFilter = 'rejected'; filter()"> Red</button>
          <button class="filter-chip" [class.active]="statusFilter === 'meeting_confirmed'" (click)="statusFilter = 'meeting_confirmed'; filter()"> Buluşma</button>
        </div>
        <span class="stat-chip">Toplam: {{ allOffers().length }}</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Alıcı</th>
              <th>Satıcı</th>
              <th>Teklif</th>
              <th>Durum</th>
              <th>Buluşma</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            @for (offer of filtered(); track offer.id) {
              <tr>
                <td>
                  <span class="product-name">{{ offer.product?.title || 'Silinmiş Ürün' }}</span>
                </td>
                <td>{{ offer.buyer?.fullName || '-' }}</td>
                <td>{{ offer.product?.seller?.fullName || '-' }}</td>
                <td><span class="price">{{ offer.offerAmount | trCurrency }}</span></td>
                <td>
                  <span class="status-badge" [class]="'status-' + offer.status">
                    {{ getStatusText(offer.status) }}
                  </span>
                </td>
                <td>
                  @if (offer.meetingPoint) {
                    <div class="meeting-info">
                      <span>📍 {{ offer.meetingPoint.name }}</span>
                      @if (offer.meetingTime) {
                        <span class="meeting-time">{{ offer.meetingTime | trDate }}</span>
                      }
                    </div>
                  } @else {
                    <span class="text-muted">-</span>
                  }
                </td>
                <td>{{ offer.createdAt | trDate }}</td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-row">Teklif bulunamadı</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styleUrl: './offers.component.scss',
})
export class OffersComponent implements OnInit {
  allOffers = signal<any[]>([]);
  filtered = signal<any[]>([]);
  statusFilter = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getAllOffers().subscribe({
      next: (data) => { this.allOffers.set(data); this.filter(); },
    });
  }

  filter() {
    const f = this.statusFilter;
    this.filtered.set(
      f ? this.allOffers().filter(o => o.status === f) : this.allOffers()
    );
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      pending: 'Bekliyor', accepted: 'Kabul Edildi', rejected: 'Reddedildi',
      countered: 'Karşı Teklif', meeting_confirmed: 'Buluşma Onaylandı', cancelled: 'İptal',
    };
    return map[status] || status;
  }
}
