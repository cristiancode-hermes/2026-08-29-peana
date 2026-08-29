import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-card-wrap">
      <button class="theme-toggle auth-theme" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'">
        {{ theme.isDark() ? '☀' : '☾' }}
      </button>
      <div class="auth-card">
        <p class="brand-word">Peana</p>
        <h1>La peana se paga, no se retiene.</h1>
        <p class="lede">Entras al mostrador con usuario o email.</p>
        <form (ngSubmit)="submit()">
          <label for="identifier">Usuario o email</label>
          <input id="identifier" name="identifier" type="text" autocomplete="off"
            [ngModel]="identifier()" (ngModelChange)="identifier.set($event)" />
          <label for="password">Contraseña</label>
          <input id="password" name="password" type="password" autocomplete="new-password"
            [ngModel]="password()" (ngModelChange)="password.set($event)" />
          @if (error()) { <p class="form-error">{{ error() }}</p> }
          <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">
            {{ auth.loading() ? 'Entrando…' : 'Entrar' }}
          </button>
        </form>
        <p><a routerLink="/registro">¿Sin cuenta? Regístrate</a></p>
        <div class="auth-demo">
          <strong>Usuario de prueba con datos</strong><br />
          <code>vecina</code> / <code>vecina@peana.test</code><br />
          <code>peana-demo-2026</code>
          <p class="muted">No autocompleta los campos.</p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  public auth = inject(AuthService);
  public theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected identifier = signal('');
  protected password = signal('');
  protected error = signal('');

  submit(): void {
    this.error.set('');
    if (!this.identifier() || !this.password()) {
      this.error.set('Escribe usuario o email y contraseña.');
      return;
    }
    this.auth.login({ identifier: this.identifier(), password: this.password() }).subscribe({
      next: () => {
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: () => this.error.set('Usuario o contraseña no coinciden'),
    });
  }
}
