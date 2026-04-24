import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api/api.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  template: `
    <div class="page">
      <div class="page-toolbar">
        <input type="text" class="search-input" placeholder="Kategori ara..."
               [(ngModel)]="searchQuery" (ngModelChange)="filterCategories()" />
        <button class="btn-primary" (click)="showAddForm.set(true)">+ Yeni Kategori</button>
      </div>

      <!-- Add/Edit Form -->
      @if (showAddForm()) {
        <div class="form-card">
          <h3>{{ editingCategory() ? 'Kategori Düzenle' : 'Yeni Kategori Ekle' }}</h3>
          <div class="form-row">
            <input type="text" class="form-input" placeholder="Kategori adı (ör: Women - Tops)"
                   [(ngModel)]="newCategoryName" />
            <input type="text" class="form-input" placeholder="Açıklama (opsiyonel)"
                   [(ngModel)]="newCategoryDesc" />
            <button class="btn-primary" (click)="saveCategory()">
              {{ editingCategory() ? 'Güncelle' : 'Ekle' }}
            </button>
            <button class="btn-cancel" (click)="cancelEdit()">İptal</button>
          </div>
        </div>
      }

      <!-- Categories Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Kategori Adı</th>
              <th>Açıklama</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            @for (cat of filteredCategories(); track cat.id) {
              <tr>
                <td><span class="id-badge">#{{ cat.id }}</span></td>
                <td><strong>{{ cat.name }}</strong></td>
                <td>{{ cat.description || '-' }}</td>
                <td>
                  <span class="status-badge" [class.active]="cat.isActive">
                    {{ cat.isActive ? 'Aktif' : 'Pasif' }}
                  </span>
                </td>
                <td>
                  <div class="action-btns">
                    <button class="btn-sm btn-edit" (click)="startEdit(cat)">✏️</button>
                    <button class="btn-sm btn-delete" (click)="confirmDelete(cat)">🗑️</button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-row">Kategori bulunamadı</td></tr>
            }
          </tbody>
        </table>
      </div>

      <app-confirm-dialog
        [visible]="showDeleteDialog()"
        title="Kategori Sil"
        [message]="'\\'' + deleteTarget()?.name + '\\' kategorisini silmek istediğinize emin misiniz?'"
        confirmText="Sil"
        icon="🗑️"
        type="danger"
        (onConfirm)="deleteCategory()"
        (onCancel)="showDeleteDialog.set(false)"
      />
    </div>
  `,
  styleUrl: './categories.component.scss',
})
export class CategoriesComponent implements OnInit {
  allCategories = signal<any[]>([]);
  filteredCategories = signal<any[]>([]);
  searchQuery = '';

  showAddForm = signal(false);
  editingCategory = signal<any>(null);
  newCategoryName = '';
  newCategoryDesc = '';

  showDeleteDialog = signal(false);
  deleteTarget = signal<any>(null);

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadCategories(); }

  loadCategories() {
    this.api.getCategories().subscribe({
      next: (data) => {
        const cats = data.categories || data || [];
        this.allCategories.set(cats);
        this.filterCategories();
      },
    });
  }

  filterCategories() {
    const q = this.searchQuery.toLowerCase();
    this.filteredCategories.set(
      this.allCategories().filter(c => !q || c.name?.toLowerCase().includes(q))
    );
  }

  startEdit(cat: any) {
    this.editingCategory.set(cat);
    this.newCategoryName = cat.name;
    this.newCategoryDesc = cat.description || '';
    this.showAddForm.set(true);
  }

  cancelEdit() {
    this.showAddForm.set(false);
    this.editingCategory.set(null);
    this.newCategoryName = '';
    this.newCategoryDesc = '';
  }

  saveCategory() {
    if (!this.newCategoryName.trim()) return;
    const payload = { name: this.newCategoryName, description: this.newCategoryDesc, isActive: true };
    const editing = this.editingCategory();

    const obs = editing
      ? this.api.updateCategory(editing.id, payload)
      : this.api.createCategory(payload);

    obs.subscribe({
      next: () => { this.cancelEdit(); this.loadCategories(); },
    });
  }

  confirmDelete(cat: any) {
    this.deleteTarget.set(cat);
    this.showDeleteDialog.set(true);
  }

  deleteCategory() {
    const id = this.deleteTarget()?.id;
    if (!id) return;
    this.api.deleteCategory(id).subscribe({
      next: () => { this.showDeleteDialog.set(false); this.loadCategories(); },
    });
  }
}
