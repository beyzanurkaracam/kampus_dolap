import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Dashboard ──
  getDashboardStats(): Observable<any> {
    return this.http.get(`${this.api}/admin/dashboard`);
  }

  // ── Products ──
  getPendingProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/pending-products`);
  }

  getAllProducts(params?: any): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }
    return this.http.get<any[]>(`${this.api}/products`, { params: httpParams });
  }

  approveProduct(id: string): Observable<any> {
    return this.http.post(`${this.api}/admin/approve-product/${id}`, {});
  }

  rejectProduct(id: string, reason?: string): Observable<any> {
    return this.http.post(`${this.api}/admin/reject-product/${id}`, { reason });
  }

  // ── Users ──
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/users`);
  }

  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.api}/admin/users/${id}`);
  }

  updateUserStatus(id: string, isActive: boolean): Observable<any> {
    return this.http.patch(`${this.api}/admin/users/${id}/status`, { isActive });
  }

  updateUserPremium(id: string, isPremium: boolean): Observable<any> {
    return this.http.patch(`${this.api}/admin/users/${id}/premium`, { isPremium });
  }

  // ── Categories ──
  getCategories(): Observable<any> {
    return this.http.get(`${this.api}/products/categories`);
  }

  createCategory(data: any): Observable<any> {
    return this.http.post(`${this.api}/admin/categories`, data);
  }

  updateCategory(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.api}/admin/categories/${id}`, data);
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.api}/admin/categories/${id}`);
  }

  // ── Universities ──
  getUniversities(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/university`);
  }

  updateUniversity(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.api}/admin/universities/${id}`, data);
  }

  getCampusLocations(universityId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/university/${universityId}/locations`);
  }

  createCampusLocation(data: any): Observable<any> {
    return this.http.post(`${this.api}/admin/campus-locations`, data);
  }

  deleteCampusLocation(id: string): Observable<any> {
    return this.http.delete(`${this.api}/admin/campus-locations/${id}`);
  }

  // ── Offers ──
  getAllOffers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/offers`);
  }

  // ── Chats ──
  getAllChats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/admin/chats`);
  }
}
