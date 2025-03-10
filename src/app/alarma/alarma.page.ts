import { Component, OnInit } from '@angular/core';
interface ScheduledAlarm {
  activationTime: string
  deactivationTime: string
  days: string[]
}

@Component({
  selector: 'app-alarma',
  templateUrl: './alarma.page.html',
  styleUrls: ['./alarma.page.scss'],
})
export class AlarmaPage implements OnInit {

  activationTime = ""
  deactivationTime = ""
  weekDays: string[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  selectedDays: boolean[] = [false, false, false, false, false, false, false]
  scheduledAlarms: ScheduledAlarm[] = []

  constructor() {}

  scheduleAlarm() {
    if (!this.activationTime || !this.deactivationTime) {
      // Show an alert or toast message
      console.error("Please select both activation and deactivation times")
      return
    }

    const selectedDayNames = this.weekDays.filter((_, index) => this.selectedDays[index])

    if (selectedDayNames.length === 0) {
      // Show an alert or toast message
      console.error("Please select at least one day of the week")
      return
    }

    const newAlarm: ScheduledAlarm = {
      activationTime: this.activationTime,
      deactivationTime: this.deactivationTime,
      days: selectedDayNames,
    }

    this.scheduledAlarms.push(newAlarm)

    // Reset form
    this.activationTime = ""
    this.deactivationTime = ""
    this.selectedDays = [false, false, false, false, false, false, false]

    // Here you would typically send this data to a backend service or local storage
    console.log("Alarm scheduled:", newAlarm)
  }

  removeAlarm(index: number) {
    this.scheduledAlarms.splice(index, 1)
    // Here you would typically update the backend service or local storage
    console.log("Alarm removed at index:", index)
  }

  ngOnInit() {
  }

}
