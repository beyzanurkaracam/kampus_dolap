import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <!-- Account Settings -->
      <div class="settings-card">
        <h3>Hesap Bilgileri</h3>
        <div class="info-row">
          <span class="info-label">Email</span>
          <span class="info-value">{{ auth.currentUser()?.email }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Rol</span>
          <span class="info-value role-badge">Admin</span>
        </div>
      </div>

      <!-- App Settings -->
      <div class="settings-card">
        <h3>⚙️ Uygulama Ayarları</h3>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Ücretsiz Kullanıcı Ürün Limiti</span>
            <span class="setting-desc">Premium olmayan kullanıcıların ekleyebileceği maksimum ürün sayısı</span>
          </div>
          <input type="number" class="setting-input" [(ngModel)]="freeLimit" min="1" max="50" />
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Ürün Otomatik Onay</span>
            <span class="setting-desc">Yeni ürünler otomatik olarak onaylansın mı?</span>
          </div>
          <label class="toggle">
            <input type="checkbox" [(ngModel)]="autoApprove" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Güvenli Buluşma Saatleri</span>
            <span class="setting-desc">Teklif buluşma saatleri aralığı</span>
          </div>
          <div class="time-range">
            <input type="time" class="setting-input sm" [(ngModel)]="safeStart" />
            <span>-</span>
            <input type="time" class="setting-input sm" [(ngModel)]="safeEnd" />
          </div>
        </div>

        <button class="btn-primary" (click)="saveSettings()">
          {{ saved() ? '✓ Kaydedildi' : 'Ayarları Kaydet' }}
        </button>
      </div>

      <!-- Danger Zone -->
      <div class="settings-card danger">
        <h3>🚨 Tehlikeli Bölge</h3>
        <div class="setting-row">
          <div class="setting-info">
            <span class="setting-label">Tüm Veritabanını Temizle</span>
            <span class="setting-desc">Bu işlem geri alınamaz. Tüm veriler silinir.</span>
          </div>
          <button class="btn-danger" disabled>Veritabanını Sil</button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  freeLimit = 3;
  autoApprove = false;
  safeStart = '08:00';
  safeEnd = '20:00';
  saved = signal(false);

  constructor(public auth: AuthService) {}

  saveSettings() {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }
}
