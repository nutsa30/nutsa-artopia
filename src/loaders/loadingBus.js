// მარტივი pub/sub, რომ ჰუკების გარეთაც შეგვეძლოს start/stop გამოძახება
const subs = new Set();

export const subscribeLoading = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export const loadingBus = {
  start() { subs.forEach(fn => fn("start")); },
  stop()  { subs.forEach(fn => fn("stop"));  },
};
