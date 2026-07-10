document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.booking-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    const start = document.getElementById('startTime').value;
    const end = document.getElementById('endTime').value;

    if (start && end && new Date(end) <= new Date(start)) {
      e.preventDefault();
      alert('End time must be after start time.');
    }
  });
});
