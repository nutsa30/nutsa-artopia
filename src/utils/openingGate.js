const ONE_HOUR = 60 * 60 * 1000;

export const hasSeenOpening = () => {
  const openedAt = localStorage.getItem("openingSeenAt");
  if (!openedAt) return false;

  const diff = Date.now() - Number(openedAt);
  return diff < ONE_HOUR;
};

export const markOpeningSeen = () => {
  localStorage.setItem("openingSeenAt", Date.now());
};

export const clearOpening = () => {
  localStorage.removeItem("openingSeenAt");
};