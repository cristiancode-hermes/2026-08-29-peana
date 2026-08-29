import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="state-screen">
      <h1>Página no encontrada</h1>
      <p class="lede">Esa ruta no está en el taller.</p>
      <a class="btn btn-primary" routerLink="/">Volver al catálogo</a>
    </div>
  `,
})
export class NotFoundPageComponent {}
