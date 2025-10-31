import { useState } from 'react';

import { ChevronDownIcon } from '../assets/icons/index.jsx';
import Card from '../components/common/Card.jsx';
import { faqItems, glossary } from '../data/helpContent.js';

const AccordionItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left flex justify-between items-center py-4 px-2 hover:bg-gray-700/50"
      >
        <span className="font-semibold">{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-4 bg-gray-900/50 text-gray-300 whitespace-pre-line">{children}</div>}
    </div>
  );
};

const HelpPage = () => (
  <div className="p-8 text-white max-w-4xl mx-auto">
    <h1 className="text-3xl font-bold mb-2">Ayuda y Glosario</h1>
    <p className="text-gray-400 mb-8">
      Encuentre respuestas a preguntas frecuentes y aprenda sobre los tipos de amenazas.
    </p>

    <Card>
      <h2 className="text-xl font-semibold mb-4">Glosario de Amenazas</h2>
      <div className="space-y-2">
        {Object.entries(glossary).map(([term, definition]) => (
          <AccordionItem key={term} title={term}>
            <p>{definition}</p>
          </AccordionItem>
        ))}
      </div>
    </Card>

    <Card className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Preguntas Frecuentes</h2>
      <div className="space-y-2">
        {faqItems.map((faq) => (
          <AccordionItem key={faq.question} title={faq.question}>
            <p>{faq.answer}</p>
          </AccordionItem>
        ))}
      </div>
    </Card>
  </div>
);

export default HelpPage;
