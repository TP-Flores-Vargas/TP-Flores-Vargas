import { useState } from "react";

import { ChevronDownIcon } from "../assets/icons/index.jsx";
import Card from "../components/common/Card.jsx";
import { faqItems, glossary } from "../data/helpContent.ts";

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
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="p-4 bg-gray-900/50 text-gray-300 whitespace-pre-line">{children}</div>}
    </div>
  );
};

const HelpPage = () => (
  <div className="p-8 text-white max-w-4xl mx-auto space-y-8">
    <div>
      <h1 className="text-3xl font-bold mb-2">Ayuda y Glosario</h1>
      <p className="text-gray-400">
        Reúne definiciones de amenazas que detecta el modelo, guías rápidas y preguntas frecuentes para sacarle el máximo al IDS.
      </p>
    </div>

    <Card>
      <h2 className="text-xl font-semibold mb-4">Glosario de amenazas</h2>
      <div className="space-y-2">
        {glossary.map((item) => (
          <AccordionItem key={item.term} title={item.term}>
            <p className="text-gray-200">{item.description}</p>
            {item.actions && (
              <ul className="mt-2 list-disc pl-5 text-xs text-gray-400 space-y-1">
                {item.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            )}
          </AccordionItem>
        ))}
      </div>
    </Card>

    <Card>
      <h2 className="text-xl font-semibold mb-4">Preguntas frecuentes</h2>
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
