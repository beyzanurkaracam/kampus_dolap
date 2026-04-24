import { Component, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="header">
      <div class="header-left">
        <button class="toggle-btn" (click)="toggleSidebar.emit()">
          <span>☰</span>
        </button>
        <h1 class="page-title">{{ title() }}</h1>
      </div>

      <div class="header-right">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Ara..." class="search-input" />
        </div>
        <div class="header-badge" *ngIf="pendingCount() > 0">
          <span class="badge-icon">📦</span>
          <span class="badge-count">{{ pendingCount() }}</span>
        </div>
      </div>
    </header>
  `,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  title = input('Dashboard');
  pendingCount = input(0);
  toggleSidebar = output<void>();
}
