(function () {
  const sanitize = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value).replace(/"/g, '""');
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue}"`;
    }
    return stringValue;
  };

  const buildCSV = (rows, headers) => {
    if (!rows?.length) return '';
    const headerRow = headers?.length ? headers : Object.keys(rows[0]);
    const dataRows = rows.map((row) => headerRow.map((key) => sanitize(row[key])).join(','));
    return [headerRow.join(','), ...dataRows].join('\n');
  };

  const exportToCSV = (filename, rows, headers) => {
    const csv = buildCSV(rows, headers);
    if (!csv) return;
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  window.Utils = window.Utils || {};
  window.Utils.exportToCSV = exportToCSV;
})();
