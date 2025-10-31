import { faqItems, glossary } from '../data/helpContent.js';
import { mockAlerts } from '../data/mockAlerts.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  async getMockAlerts() {
    await delay(150);
    return mockAlerts;
  },
  async getHelpContent() {
    await delay(80);
    return { glossary, faqItems };
  },
};
