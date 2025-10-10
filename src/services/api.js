(function () {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const api = {
    async getMockAlerts() {
      // Simula llamada al backend para prototipo
      await delay(150);
      return window.mockAlerts || [];
    },
    async getHelpContent() {
      await delay(80);
      return window.helpContent || { glossary: {}, faqItems: [] };
    },
  };

  window.Services = window.Services || {};
  window.Services.api = api;
})();

