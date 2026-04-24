import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-universities',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  template: `
    <div class="page">
      <div class="page-toolbar">
        <input type="text" class="search-input" placeholder="Üniversite ara..."
               [(ngModel)]="searchQuery" (ngModelChange)="filter()" />
        <span class="stat-chip">🎓 Toplam: {{ universities().length }}</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Üniversite</th>
              <th>Şehir</th>
              <th>Email Domain</th>
              <th>Durum</th>
              <th>Lokasyonlar</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            @for (uni of filtered(); track uni.id) {
              <tr>
                <td><strong>{{ uni.name }}</strong></td>
                <td>{{ uni.city || '-' }}</td>
                <td><code class="domain-code">{{ uni.emailDomain }}</code></td>
                <td>
                  <span class="status-badge" [class.active]="uni.isActive">
                    {{ uni.isActive ? 'Aktif' : 'Pasif' }}
                  </span>
                </td>
                <td>
                  <button class="btn-sm btn-info" (click)="loadLocations(uni)">
                    📍 Lokasyonlar
                  </button>
                </td>
                <td>
                  <button class="btn-sm"
                    [class.btn-danger-soft]="uni.isActive"
                    [class.btn-success-soft]="!uni.isActive"
                    (click)="toggleStatus(uni)">
                    {{ uni.isActive ? 'Pasif Yap' : 'Aktif Yap' }}
                  </button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="6" class="empty-row">Üniversite bulunamadı</td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Locations Panel -->
      @if (selectedUni()) {
        <div class="locations-panel">
          <div class="panel-header">
            <h3>{{ selectedUni().name }} - Kampüs Lokasyonları</h3>
            <button class="btn-close" (click)="selectedUni.set(null)">✕</button>
          </div>

          <div class="location-form">
            <input type="text" class="form-input" placeholder="Lokasyon adı" [(ngModel)]="newLocName" />
            <input type="text" class="form-input" placeholder="Tür (cafe, library, vb.)" [(ngModel)]="newLocType" />
            <input type="number" class="form-input sm" placeholder="Lat" [(ngModel)]="newLocLat" />
            <input type="number" class="form-input sm" placeholder="Lng" [(ngModel)]="newLocLng" />
            <button class="btn-primary" (click)="addLocation()">+ Ekle</button>
          </div>

          <div class="locations-list">
            @for (loc of locations(); track loc.id) {
              <div class="location-card">
                <div class="loc-icon">
                  {{ loc.type === 'cafe' ? '☕' : loc.type === 'library' ? '📚' : '🏢' }}
                </div>
                <div class="loc-info">
                  <span class="loc-name">{{ loc.name }}</span>
                  <span class="loc-type">{{ loc.type }}</span>
                </div>
                <button class="btn-sm btn-delete" (click)="deleteLocation(loc.id)">🗑️</button>
              </div>
            } @empty {
              <p class="empty-text">Henüz lokasyon eklenmemiş</p>
            }
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './universities.component.scss',
})
export class UniversitiesComponent implements OnInit {
  universities = signal<any[]>([]);
  filtered = signal<any[]>([]);
  searchQuery = '';

  selectedUni = signal<any>(null);
  locations = signal<any[]>([]);

  newLocName = '';
  newLocType = '';
  newLocLat = 0;
  newLocLng = 0;

  constructor(private api: ApiService) {}

  ngOnInit() { this.load(); }

  load() {
    this.api.getUniversities().subscribe({
      next: (data) => { this.universities.set(data); this.filter(); },
    });
  }

  filter() {
    const q = this.searchQuery.toLowerCase();
    this.filtered.set(this.universities().filter(u =>
      !q || u.name?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q)
    ));
  }

  toggleStatus(uni: any) {
    this.api.updateUniversity(uni.id, { isActive: !uni.isActive }).subscribe({
      next: () => { uni.isActive = !uni.isActive; },
    });
  }

  loadLocations(uni: any) {
    this.selectedUni.set(uni);
    this.api.getCampusLocations(uni.id).subscribe({
      next: (data) => this.locations.set(data),
    });
  }

  addLocation() {
    if (!this.newLocName.trim()) return;
    this.api.createCampusLocation({
      name: this.newLocName,
      type: this.newLocType || 'other',
      latitude: this.newLocLat,
      longitude: this.newLocLng,
      universityId: this.selectedUni().id,
    }).subscribe({
      next: () => {
        this.loadLocations(this.selectedUni());
        this.newLocName = ''; this.newLocType = ''; this.newLocLat = 0; this.newLocLng = 0;
      },
    });
  }

  deleteLocation(id: string) {
    this.api.deleteCampusLocation(id).subscribe({
      next: () => this.loadLocations(this.selectedUni()),
    });
  }
}
