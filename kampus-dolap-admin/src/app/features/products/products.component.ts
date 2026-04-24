import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { TrDatePipe, TrCurrencyPipe } from '../../shared/pipes/tr-pipes';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, TrDatePipe, TrCurrencyPipe],
  template: `
    <div class="products-page">
      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          [class.active]="activeTab() === 'pending'"
          (click)="activeTab.set('pending'); loadPending()"
        >
          ⏳ Onay Bekleyenler
          @if (pendingProducts().length > 0) {
            <span class="tab-badge">{{ pendingProducts().length }}</span>
          }
        </button>
        <button
          class="tab"
          [class.active]="activeTab() === 'all'"
          (click)="activeTab.set('all'); loadAll()"
        >
          📦 Tüm Ürünler
        </button>
      </div>

      <!-- Filters -->
      @if (activeTab() === 'all') {
        <div class="filters-bar">
          <input
            type="text"
            class="filter-input"
            placeholder="Ürün ara..."
            [(ngModel)]="searchQuery"
            (ngModelChange)="loadAll()"
          />
          <select class="filter-select" [(ngModel)]="statusFilter" (ngModelChange)="loadAll()">
            <option value="">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="pending">Bekliyor</option>
            <option value="sold">Satıldı</option>
            <option value="removed">Kaldırıldı</option>
          </select>
          <select class="filter-select" [(ngModel)]="sortFilter" (ngModelChange)="loadAll()">
            <option value="">Sıralama</option>
            <option value="price_asc">Fiyat ↑</option>
            <option value="price_desc">Fiyat ↓</option>
          </select>
        </div>
      }

      <!-- Product Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Satıcı</th>
              <th>Kategori</th>
              <th>Fiyat</th>
              <th>Durum</th>
              <th>Tarih</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            @for (product of currentProducts(); track product.id) {
              <tr>
                <td>
                  <div class="product-cell">
                    <div class="product-thumb">
                      @if (product.images?.length > 0) {
                        <img [src]="product.images[0].imageUrl" alt="" />
                      } @else {
                        <span>📦</span>
                      }
                    </div>
                    <div class="product-info">
                      <span class="product-title">{{ product.title }}</span>
                      <span class="product-brand">{{ product.brand || '-' }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="seller-name">{{ product.seller?.fullName || 'Bilinmeyen' }}</span>
                </td>
                <td>
                  <span class="category-tag">{{ product.category?.name || product.categoryName || '-' }}</span>
                </td>
                <td>
                  <span class="price">{{ product.price | trCurrency }}</span>
                </td>
                <td>
                  <span class="status-badge" [class]="'status-' + product.status">
                    {{ getStatusText(product.status) }}
                  </span>
                </td>
                <td>
                  <span class="date-text">{{ product.createdAt | trDate }}</span>
                </td>
                <td>
                  <div class="action-btns">
                    @if (product.status === 'pending') {
                      <button class="btn-sm btn-approve" (click)="approve(product.id)">✓</button>
                      <button class="btn-sm btn-reject" (click)="confirmReject(product)">✕</button>
                    }
                    @if (product.status === 'active') {
                      <button class="btn-sm btn-reject" (click)="confirmReject(product)">Kaldır</button>
                    }
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty-row">
                  {{ activeTab() === 'pending' ? 'Onay bekleyen ürün yok 🎉' : 'Ürün bulunamadı' }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <app-confirm-dialog
        [visible]="showRejectDialog()"
        title="Ürünü Reddet"
        [message]="'\\'' + rejectTarget()?.title + '\\' ürününü reddetmek istediğinize emin misiniz?'"
        confirmText="Reddet"
        icon="🗑️"
        type="danger"
        (onConfirm)="reject()"
        (onCancel)="showRejectDialog.set(false)"
      />
    </div>
  `,
  styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit {
  activeTab = signal<'pending' | 'all'>('pending');
  pendingProducts = signal<any[]>([]);
  allProducts = signal<any[]>([]);
  loading = signal(false);

  searchQuery = '';
  statusFilter = '';
  sortFilter = '';

  showRejectDialog = signal(false);
  rejectTarget = signal<any>(null);

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadPending();
  }

  currentProducts() {
    return this.activeTab() === 'pending' ? this.pendingProducts() : this.allProducts();
  }

  loadPending() {
    this.api.getPendingProducts().subscribe({
      next: (data) => this.pendingProducts.set(data),
    });
  }

  loadAll() {
    const params: any = {};
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.statusFilter) params.status = this.statusFilter;
    if (this.sortFilter) params.sort = this.sortFilter;

    this.api.getAllProducts(params).subscribe({
      next: (data) => this.allProducts.set(data),
    });
  }

  approve(id: string) {
    this.api.approveProduct(id).subscribe({
      next: () => {
        this.loadPending();
        if (this.activeTab() === 'all') this.loadAll();
      },
    });
  }

  confirmReject(product: any) {
    this.rejectTarget.set(product);
    this.showRejectDialog.set(true);
  }

  reject() {
    const id = this.rejectTarget()?.id;
    if (!id) return;
    this.api.rejectProduct(id).subscribe({
      next: () => {
        this.showRejectDialog.set(false);
        this.rejectTarget.set(null);
        this.loadPending();
        if (this.activeTab() === 'all') this.loadAll();
      },
    });
  }

  getStatusText(status: string): string {
    const map: Record<string, string> = {
      active: 'Aktif', pending: 'Bekliyor', sold: 'Satıldı',
      removed: 'Kaldırıldı', reserved: 'Rezerve',
    };
    return map[status] || status;
  }
}
