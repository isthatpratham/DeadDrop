export const createShutdownGate = () => {
  let started = false;

  return {
    tryStart(): boolean {
      if (started) {
        return false;
      }
      started = true;
      return true;
    },
  };
};
