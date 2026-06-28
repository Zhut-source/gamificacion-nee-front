import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccessibleAlertComponent } from 'src/app/components/layout/alertas/accessible-alert.component';
import { HeaderComponent } from 'src/app/components/layout/header/header.component';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, AccessibleAlertComponent],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.scss'
})
export class PrivateLayoutComponent {

}
