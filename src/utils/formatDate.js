(function () {
  window.Utils = window.Utils || {};
  window.Utils.formatDate = (isoString, template = 'DD/MM/YYYY h:mm A') => {
    if (!isoString) return '—';
    return dayjs(isoString).format(template);
  };
})();

