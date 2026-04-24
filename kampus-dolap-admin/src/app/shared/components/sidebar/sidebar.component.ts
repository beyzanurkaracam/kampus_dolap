import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
      <div class="sidebar-brand">
        <span class="brand-text" *ngIf="!collapsed()">Kampüs Dolap</span>
      </div>

      <nav class="sidebar-nav">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            class="nav-item"
            [title]="item.label"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label" *ngIf="!collapsed()">{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <div class="admin-info" *ngIf="!collapsed()">
          
          <span class="admin-email">{{ auth.currentUser()?.email }}</span>
        </div>
        <button class="logout-btn" (click)="auth.logout()" [title]="'Çıkış Yap'">
         
          <span *ngIf="!collapsed()">Çıkış</span>
        </button>
      </div>
    </aside>
  `,
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  collapsed = input(false);

  navItems: NavItem[] = [
    { label: 'Dashboard', icon: '', route: '/dashboard' },
    { label: 'Ürünler', icon: '', route: '/products' },
    { label: 'Kullanıcılar', icon: '', route: '/users' },
    { label: 'Kategoriler', icon: '', route: '/categories' },
    { label: 'Üniversiteler', icon: '', route: '/universities' },
    { label: 'Teklifler', icon: '', route: '/offers' },
    { label: 'Mesajlar', icon: '', route: '/chats' },
    { label: 'Ayarlar', icon: '', route: '/settings' },
  ];

  constructor(public auth: AuthService) {}
}
