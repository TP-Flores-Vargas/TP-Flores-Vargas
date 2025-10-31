(function () {
  const { useEffect, useState } = React;
  const { Card } = window.Common || {};
  const { ChevronDownIcon } = window.Icons || {};

  const AccordionItem = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="border-b border-gray-700">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left flex justify-between items-center py-4 px-2 hover:bg-gray-700/50"
        >
          <span className="font-semibold">{title}</span>
          <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && <div className="p-4 bg-gray-900/50 text-gray-300 whitespace-pre-line">{children}</div>}
      </div>
    );
  };

  const HelpPage = () => {
    const [content, setContent] = useState(() => window.helpContent || { glossary: {}, faqItems: [] });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
      let active = true;
      const loadContent = async () => {
        const api = window.Services?.api;
        if (!api?.fetchHelpContent && !api?.getMockHelp) return;
        setIsLoading(true);
        setError('');
        try {
          let response = null;
          if (api.fetchHelpContent) {
            response = await api.fetchHelpContent();
          }
          if (!response && api.getMockHelp) {
            response = await api.getMockHelp();
          }
          if (active) {
            setContent(response || { glossary: {}, faqItems: [] });
          }
        } catch (loadError) {
          console.warn('No se pudo obtener el contenido de ayuda', loadError);
          if (active) {
            setContent(window.helpContent || { glossary: {}, faqItems: [] });
            setError('Mostrando información local por un problema al contactar el backend.');
          }
        } finally {
          if (active) setIsLoading(false);
        }
      };

      loadContent();
      return () => {
        active = false;
      };
    }, []);

    const glossaryEntries = Object.entries(content.glossary || {});

    return (
      <div className="p-8 text-white max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Ayuda y Glosario</h1>
        <p className="text-gray-400 mb-8">
          Encuentre respuestas a preguntas frecuentes y aprenda sobre los tipos de amenazas.
        </p>
        {isLoading && <p className="text-sm text-blue-300 mb-4">Cargando contenido actualizado...</p>}
        {error && <p className="text-sm text-yellow-400 mb-4">{error}</p>}

        <Card>
          <h2 className="text-xl font-semibold mb-4">Glosario de Amenazas</h2>
          <div className="space-y-2">
            {glossaryEntries.map(([term, definition]) => (
              <AccordionItem key={term} title={term}>
                <p>{definition}</p>
              </AccordionItem>
            ))}
            {!glossaryEntries.length && !isLoading && (
              <p className="text-sm text-gray-400">No hay términos disponibles en este momento.</p>
            )}
          </div>
        </Card>

        <Card className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Preguntas Frecuentes</h2>
          <div className="space-y-2">
            {(content.faqItems || []).map((faq) => (
              <AccordionItem key={faq.question} title={faq.question}>
                <p>{faq.answer}</p>
              </AccordionItem>
            ))}
            {!content.faqItems?.length && !isLoading && (
              <p className="text-sm text-gray-400">No hay preguntas frecuentes registradas.</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  window.Pages = window.Pages || {};
  window.Pages.HelpPage = HelpPage;
})();

