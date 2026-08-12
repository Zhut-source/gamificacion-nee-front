import { TestBed } from '@angular/core/testing';

import { AudiosettingsService } from './audiosettings.service';

describe('AudiosettingsService', () => {
  let service: AudiosettingsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudiosettingsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
