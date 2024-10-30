import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DivicesPage } from './divices.page';

describe('DivicesPage', () => {
  let component: DivicesPage;
  let fixture: ComponentFixture<DivicesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DivicesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
