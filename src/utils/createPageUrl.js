export const createPageUrl = (page) => {
  if (page === 'Dashboard') {
    return '/';
  }
  return `/${page.toLowerCase()}`;
};
