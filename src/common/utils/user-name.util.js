const normalizeNameText = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const splitFullName = (fullName = '') => {
  const parts = normalizeNameText(fullName).split(' ').filter(Boolean);

  if (!parts.length) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const getDisplayName = (user = {}) => {
  return normalizeNameText(
    [user.firstName, user.lastName].filter(Boolean).join(' '),
  ) || normalizeNameText(user.name);
};

const normalizeUserNameParts = ({ firstName = '', lastName = '', name = '' } = {}) => {
  const normalizedFirstName = normalizeNameText(firstName);
  const normalizedLastName = normalizeNameText(lastName);

  if (normalizedFirstName || normalizedLastName) {
    return {
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      name: normalizeNameText([normalizedFirstName, normalizedLastName].filter(Boolean).join(' ')),
    };
  }

  const splitName = splitFullName(name);

  return {
    ...splitName,
    name: getDisplayName(splitName),
  };
};

export {
  getDisplayName,
  normalizeNameText,
  normalizeUserNameParts,
  splitFullName,
};
