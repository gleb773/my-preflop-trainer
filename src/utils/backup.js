export const STORAGE_KEYS = {
  ranges: 'pokerRangesV12',
  colors: 'pokerColorsV12',
  hotkeys: 'pokerHotkeysV12',
  history: 'pokerHistoryV1',
  activity: 'pokerActivityV1',
  dailyGoal: 'pokerDailyGoalV1',
  autoBackup: 'pokerRangesV12_autobackup',
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Проверяет структуру файла бэкапа: { ranges, actionColors?, hotkeys?, history? }.
 * ranges[папка][ситуация][спот] — объекты.
 */
export function validateBackup(data) {
  if (!isPlainObject(data)) return 'Файл не является объектом JSON';
  if (!isPlainObject(data.ranges)) return 'В файле нет раздела ranges';
  for (const [cat, sits] of Object.entries(data.ranges)) {
    if (!isPlainObject(sits)) return `Папка "${cat}" повреждена`;
    for (const [sit, spots] of Object.entries(sits)) {
      if (!isPlainObject(spots)) return `Ситуация "${cat} / ${sit}" повреждена`;
      for (const [spot, hands] of Object.entries(spots)) {
        if (!isPlainObject(hands)) return `Спот "${cat} / ${sit} / ${spot}" поврежден`;
      }
    }
  }
  if (data.history !== undefined && !Array.isArray(data.history)) return 'Раздел history поврежден';
  if (data.activity !== undefined && !isPlainObject(data.activity)) return 'Раздел activity поврежден';
  return null;
}

export function countSpots(ranges) {
  let n = 0;
  Object.values(ranges).forEach(sits => Object.values(sits).forEach(spots => { n += Object.keys(spots).length; }));
  return n;
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const backupFilename = () => `poker_backup_${new Date().toLocaleDateString('ru-RU')}.json`;
