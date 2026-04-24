import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-card" [style.--accent]="color()">
      <div class="stats-icon">{{ icon() }}</div>
      <div class="stats-content">
        <span class="stats-value">{{ value() }}</span>
        <span class="stats-label">{{ label() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .stats-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 24px;
      background: #fff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
      cursor: default;
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
      }
    }
    .stats-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: color-mix(in srgb, var(--accent, #3b82f6) 12%, transparent);
      font-size: 24px;
      flex-shrink: 0;
    }
    .stats-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .stats-value {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .stats-label {
      font-size: 13px;
      color: #64748b;
      font-weight: 500;
    }
  `],
})
export class StatsCardComponent {
  icon = input('📊');
  value = input<number | string>(0);
  label = input('');
  color = input('#3b82f6');
}
