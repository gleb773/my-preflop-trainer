export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60); const s = Math.round(seconds % 60);
  return `${m} мин ${s} сек`;
};

export const spotKey = (s) => `${s.cat} / ${s.sit} / ${s.spot}`;
