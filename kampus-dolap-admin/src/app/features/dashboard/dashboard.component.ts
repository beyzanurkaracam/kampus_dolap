import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { StatsCardComponent } from '../../shared/components/stats-card/stats-card.component';
import { TrDatePipe, TrCurrencyPipe } from '../../shared/pipes/tr-pipes';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, StatsCardComponent, TrDatePipe, TrCurrencyPipe],
  template: `
    <div class="dashboard">
      <!-- Stats Grid -->
      <div class="stats-grid">
        <app-stats-card [value]="stats().totalUsers" label="Toplam Kullanıcı" color="#3b82f6" />
        <app-stats-card [value]="stats().totalProducts" label="Toplam Ürün" color="#8b5cf6" />
        <app-stats-card [value]="stats().activeProducts" label="Aktif Ürün" color="#22c55e" />
        <app-stats-card [value]="stats().pendingProducts" label="Onay Bekleyen" color="#f59e0b" />
      </div>

      <!-- Pending Products Alert -->
      @if (stats().pendingProducts > 0) {
        <div class="alert-banner">
          <span><strong>{{ stats().pendingProducts }}</strong> ürün onayınızı bekliyor.</span>
          <a routerLink="/products" class="alert-link">İncele →</a>
        </div>
      }

      <div class="dashboard-grid">
        <!-- Recent Users -->
        <div class="card">
          <div class="card-header">
            <h3>Son Kayıt Olan Kullanıcılar</h3>
            <a routerLink="/users" class="view-all">Tümünü Gör →</a>
          </div>
          <div class="card-body">
            @if (recentUsers().length === 0) {
              <p class="empty-text">Henüz kullanıcı yok</p>
            }
            @for (user of recentUsers(); track user.id) {
              <div class="list-row">
                <div class="user-avatar">{{ user.fullName?.charAt(0) || '?' }}</div>
                <div class="list-info">
                  <span class="list-primary">{{ user.fullName }}</span>
                  <span class="list-secondary">{{ user.email }}</span>
                </div>
                <span class="list-date">{{ user.createdAt | trDate }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Recent Products -->
        <div class="card">
          <div class="card-header">
            <h3>Son Eklenen Ürünler</h3>
            <a routerLink="/products" class="view-all">Tümünü Gör →</a>
          </div>
          <div class="card-body">
            @if (recentProducts().length === 0) {
              <p class="empty-text">Henüz ürün yok</p>
            }
            @for (product of recentProducts(); track product.id) {
              <div class="list-row">
                <div class="product-thumb">📦</div>
                <div class="list-info">
                  <span class="list-primary">{{ product.title }}</span>
                  <span class="list-secondary">{{ product.seller?.fullName || 'Bilinmeyen' }}</span>
                </div>
                <div class="list-right">
                  <span class="product-price">{{ product.price | trCurrency }}</span>
                  <span class="status-badge" [class]="'status-' + product.status">
                    {{ getStatusText(product.status) }}
                  </span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  stats = signal<any>({
    totalUsers: 0, totalProducts: 0, activeProducts: 0, pendingProducts: 0, totalAdmins: 0
  });
  recentUsers = signal<any[]>([]);
  recentProducts = signal<any[]>([]);
  loading = signal(true);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getDashboardStats().subscribe({
      next: (data) => {
        this.stats.set(data.stats);
        this.recentUsers.set(data.recentUsers || []);
        this.recentProducts.set(data.recentProducts || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      active: 'Aktif', pending: 'Bekliyor', sold: 'Satıldı', removed: 'Kaldırıldı', reserved: 'Rezerve'
    };
    return map[status] || status;
  }
}
