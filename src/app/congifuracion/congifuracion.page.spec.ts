import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CongifuracionPage } from './congifuracion.page';

describe('CongifuracionPage', () => {
  let component: CongifuracionPage;
  let fixture: ComponentFixture<CongifuracionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CongifuracionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
