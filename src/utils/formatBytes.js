(function () {
  window.Utils = window.Utils || {};
  window.Utils.formatBytes = (valueInBytes, decimals = 1) => {
    if (!valueInBytes || valueInBytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const exponent = Math.min(Math.floor(Math.log(valueInBytes) / Math.log(1024)), units.length - 1);
    const value = valueInBytes / Math.pow(1024, exponent);
    return `${value.toFixed(decimals)} ${units[exponent]}`;
  };
})();

