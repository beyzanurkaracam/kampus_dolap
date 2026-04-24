import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-page">
      <div class="login-bg">
        <div class="bg-shape shape-1"></div>
        <div class="bg-shape shape-2"></div>
        <div class="bg-shape shape-3"></div>
      </div>

      <div class="login-card">
        <div class="card-header">
          <span class="logo">🎓</span>
          <h1>Kampüs Dolap</h1>
          <p>Admin Paneli</p>
        </div>

        <form (ngSubmit)="handleLogin()" class="login-form">
          <div class="form-group">
            <label>Email</label>
            <div class="input-wrapper">
              <span class="input-icon"></span>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="admin@sakarya.edu.tr"
                required
                [disabled]="loading()"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Şifre</label>
            <div class="input-wrapper">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="••••••••"
                required
                [disabled]="loading()"
              />
              <button type="button" class="toggle-pw" (click)="showPassword.set(!showPassword())">
                
              </button>
            </div>
          </div>

          @if (error()) {
            <div class="error-msg">
              <span>⚠️</span> {{ error() }}
            </div>
          }

          <button type="submit" class="login-btn" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner"></span> Giriş yapılıyor...
            } @else {
              Giriş Yap
            }
          </button>
        </form>

        <p class="footer-note">Sadece yetkili admin kullanıcılar giriş yapabilir.</p>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPassword = signal(false);

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn()) {
      router.navigate(['/dashboard']);
    }
  }

  async handleLogin() {
    if (!this.email || !this.password) {
      this.error.set('Lütfen tüm alanları doldurun');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.auth.login(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (e: any) {
      this.error.set(e.message || 'Giriş başarısız');
    } finally {
      this.loading.set(false);
    }
  }
}
