import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmService, ConfirmData } from '@core/services/confirm.service';
import { TtsService } from '@core/services/tts.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
})
export class ConfirmDialogComponent implements OnInit {
  data: ConfirmData | null = null;

  constructor(
    private confirmService: ConfirmService,
    public tts: TtsService,
  ) {}

  ngOnInit() {
    this.confirmService.confirmState$.subscribe((res) => {
      this.data = res;
    });
  }

  onConfirm() {
    this.confirmService.respond(true);
  }

  onCancel() {
    this.confirmService.respond(false);
  }

  escucharComfirm() {
    if (this.tts.isPlaying) {
      this.tts.stop();
    } else if (this.data?.message) {
      this.tts.speak(this.data.message);
    }
  }
}
