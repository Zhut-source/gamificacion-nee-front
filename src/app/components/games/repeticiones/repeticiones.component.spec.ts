import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepeticionesComponent } from './repeticiones.component';

describe('RepeticionesComponent', () => {
  let component: RepeticionesComponent;
  let fixture: ComponentFixture<RepeticionesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepeticionesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepeticionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
