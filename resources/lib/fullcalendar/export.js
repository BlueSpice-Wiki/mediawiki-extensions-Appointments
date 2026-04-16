// Expose FullCalendar globally so other RL modules can access it.
// The global build assigns to `var FullCalendar` which stays local
// inside ResourceLoader's script closure.
window.FullCalendar = FullCalendar;
