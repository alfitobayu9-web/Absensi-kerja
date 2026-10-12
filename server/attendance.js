export const STANDARD_WORK_MINUTES = 8 * 60;
export const OVERTIME_BONUS = 25000;

export function jakartaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function calculateWorkMinutes(checkInAt, checkOutAt) {
  return Math.max(0, Math.floor((new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / 60000));
}

export function calculateOvertime(workMinutes) {
  const overtimeMinutes = Math.max(0, workMinutes - STANDARD_WORK_MINUTES);

  return {
    overtimeMinutes,
    bonusAmount: overtimeMinutes > 0 ? OVERTIME_BONUS : 0,
  };
}

export function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
}
