import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { TrDatePipe } from '../../shared/pipes/tr-pipes';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, TrDatePipe, ConfirmDialogComponent],
  template: `
    <div class="page">
      <div class="page-toolbar">
        <input type="text" class="search-input" placeholder="Kullanıcı ara (isim, email)..."
               [(ngModel)]="searchQuery" (ngModelChange)="filterUsers()" />
        <div class="toolbar-stats">
          <span class="stat-chip">👥 Toplam: {{ allUsers().length }}</span>
          <span class="stat-chip premium">👑 Premium: {{ premiumCount() }}</span>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Kullanıcı</th>
              <th>Üniversite</th>
              <th>Bölüm</th>
              <th>Durum</th>
              <th>Premium</th>
              <th>Kayıt Tarihi</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track user.id) {
              <tr>
                <td>
                  <div class="user-cell">
                    <div class="avatar">{{ user.fullName?.charAt(0)?.toUpperCase() || '?' }}</div>
                    <div class="user-info">
                      <span class="user-name">{{ user.fullName }}</span>
                      <span class="user-email">{{ user.email }}</span>
                    </div>
                  </div>
                </td>
                <td>{{ user.university?.name || '-' }}</td>
                <td>{{ user.department || '-' }}</td>
                <td>
                  <span class="status-dot" [class.active]="user.isActive"></span>
                  {{ user.isActive ? 'Aktif' : 'Banlı' }}
                </td>
                <td>
                  @if (user.isPremium) {
                    <span class="premium-badge">👑 PRO</span>
                  } @else {
                    <span class="free-badge">Ücretsiz</span>
                  }
                </td>
                <td>{{ user.createdAt | trDate }}</td>
                <td>
                  <div class="action-btns">
                    <button class="btn-sm"
                      [class.btn-danger-soft]="user.isActive"
                      [class.btn-success-soft]="!user.isActive"
                      (click)="toggleBan(user)">
                      {{ user.isActive ? 'Banla' : 'Aktif Et' }}
                    </button>
                    <button class="btn-sm btn-premium-toggle"
                      (click)="togglePremium(user)">
                      {{ user.isPremium ? 'PRO Kaldır' : 'PRO Yap' }}
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty-row">Kullanıcı bulunamadı</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  allUsers = signal<any[]>([]);
  filteredUsers = signal<any[]>([]);
  searchQuery = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.api.getAllUsers().subscribe({
      next: (data) => {
        this.allUsers.set(data);
        this.filterUsers();
      },
    });
  }

  filterUsers() {
    const q = this.searchQuery.toLowerCase();
    const filtered = this.allUsers().filter(u =>
      !q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
    this.filteredUsers.set(filtered);
  }

  premiumCount(): number {
    return this.allUsers().filter(u => u.isPremium).length;
  }

  toggleBan(user: any) {
    this.api.updateUserStatus(user.id, !user.isActive).subscribe({
      next: () => {
        user.isActive = !user.isActive;
        this.filterUsers();
      },
    });
  }

  togglePremium(user: any) {
    this.api.updateUserPremium(user.id, !user.isPremium).subscribe({
      next: () => {
        user.isPremium = !user.isPremium;
        this.filterUsers();
      },
    });
  }
}
