import dayjs from 'dayjs';

export const formatDate = (isoString, template = 'DD/MM/YYYY h:mm A') => {
  if (!isoString) return '—';
  return dayjs(isoString).format(template);
};
