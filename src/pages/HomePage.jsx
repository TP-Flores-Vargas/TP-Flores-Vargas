(function () {
  const { Button, Card } = window.Common || {};
  const {
    ShieldIcon,
    LayoutDashboardIcon,
    BellIcon,
    FileTextIcon,
    SettingsIcon,
    CheckCircleIcon,
  } = window.Icons || {};
  const { constants } = window.Config || {};

  const HomePage = ({ onNavigate }) => (
    <div className="p-10 space-y-12">
      <section className="bg-gradient-to-r from-blue-700/40 via-blue-600/20 to-transparent rounded-3xl border border-blue-500/20 shadow-xl p-10 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
          <div className="space-y-6 lg:w-2/3">
            <span className="inline-flex items-center text-xs font-semibold uppercase tracking-widest text-blue-300/80 bg-blue-500/10 px-3 py-1 rounded-full">
              Proyecto de Tesis
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              Sistema de Detección de Intrusiones para Redes Educativas
            </h1>
            <p className="text-lg text-gray-200/90 leading-relaxed">
              Plataforma integral que centraliza la visibilidad de la seguridad de tu institución educativa. Analiza eventos en tiempo real,
              detecta comportamientos anómalos y presenta respuestas accionables para reducir el impacto de incidentes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => onNavigate?.('dashboard')} className="px-6 py-3 text-base">
                Ver Dashboard en Vivo
              </Button>
              <button
                type="button"
                onClick={() => onNavigate?.('alertas')}
                className="px-6 py-3 text-base font-semibold text-blue-300 border border-blue-500/40 rounded-md hover:border-blue-400 hover:text-blue-200 transition-colors"
              >
                Revisar Alertas Actuales
              </button>
            </div>
          </div>
          <div className="lg:w-1/3">
            <div className="bg-gray-900/60 border border-gray-700/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <ShieldIcon className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-sm text-gray-300">Versión</p>
                  <p className="text-2xl font-semibold">{constants?.VERSION || '1.0.0'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Cobertura</p>
                  <p className="font-semibold text-white">Red LAN, WiFi y Servicios Cloud</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Tecnologías</p>
                  <p className="font-semibold text-white">Detección basada en firmas y comportamiento</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs uppercase tracking-wide text-gray-400">Objetivo</p>
                  <p className="font-semibold text-white">
                    Reducir incidentes de seguridad en instituciones educativas mediante automatización y visualización inteligente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-white">
        {[
          {
            title: 'Monitoreo Centralizado',
            description: 'Panel unificado con indicadores clave de infraestructura, estados de sensores y correlación de eventos críticos.',
            icon: LayoutDashboardIcon,
            accent: 'from-sky-600/30 to-transparent',
          },
          {
            title: 'Alertas Accionables',
            description: 'Clasificación automática por criticidad, contexto enriquecido y recomendaciones operativas paso a paso.',
            icon: BellIcon,
            accent: 'from-rose-600/30 to-transparent',
          },
          {
            title: 'Reportes Ejecutivos',
            description: 'Reportes descargables con métricas de tendencias, cumplimiento y trazabilidad para auditorías.',
            icon: FileTextIcon,
            accent: 'from-amber-500/30 to-transparent',
          },
          {
            title: 'Políticas Adaptables',
            description: 'Configuración flexible para perfiles de riesgo, umbrales de detección y reglas de respuesta automatizadas.',
            icon: SettingsIcon,
            accent: 'from-emerald-500/30 to-transparent',
          },
        ].map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <Card key={feature.title} className={`relative overflow-hidden bg-gray-900/70 border border-gray-800/80`}> 
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-60`} />
              <div className="relative space-y-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/30">
                  <FeatureIcon className="w-6 h-6 text-blue-300" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{feature.description}</p>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-6 text-white">
        <Card className="lg:col-span-3 bg-gray-900/70 border border-gray-800/80">
          <h2 className="text-2xl font-semibold mb-4">Arquitectura del Sistema</h2>
          <p className="text-sm text-gray-300 leading-relaxed">
            El prototipo integra sensores desplegados en la red escolar, un motor de correlación y una capa analítica que consolida la información en este panel. El sistema prioriza la facilidad de uso para equipos de TI reducidos y permite
            acciones correctivas inmediatas.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
              <span>Captura de tráfico y eventos desde firewalls, IDS de borde y agentes en aulas de cómputo.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
              <span>Motor analítico que aplica reglas de detección y modelos de comportamiento entrenados con tráfico académico.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-blue-400" />
              <span>Respuesta guiada con recomendaciones específicas para personal administrativo y docente.</span>
            </li>
          </ul>
        </Card>
        <Card className="lg:col-span-2 bg-gray-900/70 border border-gray-800/80 space-y-4">
          <h2 className="text-2xl font-semibold">Estado General</h2>
          <div className="flex items-center justify-between bg-gray-800/80 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm text-gray-400">Centros educativos protegidos</p>
              <p className="text-2xl font-bold">12</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex justify-between">
              <span>Alertas críticas mitigadas</span>
              <span className="font-semibold text-white">92%</span>
            </div>
            <div className="flex justify-between">
              <span>Tiempo medio de respuesta</span>
              <span className="font-semibold text-white">18 min</span>
            </div>
            <div className="flex justify-between">
              <span>Disponibilidad del motor de correlación</span>
              <span className="font-semibold text-white">99.8%</span>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );

  window.Pages = window.Pages || {};
  window.Pages.HomePage = HomePage;
})();
