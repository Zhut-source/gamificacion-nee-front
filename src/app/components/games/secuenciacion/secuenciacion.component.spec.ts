import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecuenciacionComponent } from './secuenciacion.component';

describe('SecuenciacionComponent', () => {
  let component: SecuenciacionComponent;
  let fixture: ComponentFixture<SecuenciacionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SecuenciacionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SecuenciacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
