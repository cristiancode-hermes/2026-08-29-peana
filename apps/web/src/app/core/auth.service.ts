import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, finalize, map } from 'rxjs';
import type { AuthResponse, User } from '../shared/models';
import { TOKEN_KEY, API } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly userSignal = signal<User | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly pointsSignal = signal(0);

  readonly user = this.userSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly points = this.pointsSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.getToken());
  readonly isStaff = computed(() => {
    const r = this.userSignal()?.role;
    return r === 'staff' || r === 'admin';
  });
  readonly isAdmin = computed(() => this.userSignal()?.role === 'admin');

  constructor() {
    queueMicrotask(() => this.bootstrap());
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private setToken(token: string | null): void {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  setUser(user: User | null): void {
    this.userSignal.set(user);
    if (user) this.pointsSignal.set(user.points || 0);
  }

  bootstrap(): void {
    const token = this.getToken();
    if (!token) {
      this.userSignal.set(null);
      return;
    }
    this.loadingSignal.set(true);
    this.me()
      .pipe(
        catchError(() => {
          this.setToken(null);
          this.userSignal.set(null);
          return of(null);
        }),
        finalize(() => this.loadingSignal.set(false)),
      )
      .subscribe((u) => {
        if (u) {
          this.userSignal.set(u);
          this.pointsSignal.set(u.points || 0);
        }
      });
  }

  login(payload: { identifier: string; password: string }): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    return this.http
      .post<AuthResponse>(`${API}/auth/login`, {
        identifier: payload.identifier,
        login: payload.identifier,
        usernameOrEmail: payload.identifier,
        password: payload.password,
      })
      .pipe(
        tap((res) => this.applyAuth(res)),
        finalize(() => this.loadingSignal.set(false)),
      );
  }

  register(body: { username: string; email: string; password: string }): Observable<AuthResponse> {
    this.loadingSignal.set(true);
    return this.http.post<AuthResponse>(`${API}/auth/register`, body).pipe(
      tap((res) => this.applyAuth(res)),
      finalize(() => this.loadingSignal.set(false)),
    );
  }

  me(): Observable<User> {
    return this.http.get<{ user: User; points?: number }>(`${API}/auth/me`).pipe(
      map((res) => ({ ...res.user, points: res.points ?? res.user.points })),
    );
  }

  logout(): void {
    this.setToken(null);
    this.userSignal.set(null);
    void this.router.navigateByUrl('/');
  }

  private applyAuth(res: AuthResponse): void {
    this.setToken(res.accessToken);
    this.userSignal.set(res.user);
    this.pointsSignal.set(res.user.points || 0);
  }
}
