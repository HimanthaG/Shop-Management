
let activeUserId = null;

export const setActiveUser = (userId) => {
  const id = Number(userId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Invalid account ID.');
  }

  activeUserId = id;
};

export const getActiveUserId = () => {
  if (
    !Number.isSafeInteger(activeUserId) ||
    activeUserId <= 0
  ) {
    throw new Error(
      'No active account. Please log in again.'
    );
  }

  return activeUserId;
};

export const clearActiveUser = () => {
  activeUserId = null;
};
