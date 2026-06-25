type PageProps = {
  title: string;
  description: string;
};

function ModulePage({ title, description }: PageProps) {
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-[#111111]">
      <div className="mx-auto max-w-5xl">
        <a href="/dashboard" className="text-sm text-[#6B7280] hover:text-black">
          ← Volver a ALMA
        </a>

        <div className="mt-10 rounded-[2rem] border border-[#E5E7EB] bg-[#F7F7F8] p-10">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[#6B7280]">
            ALMA Module
          </p>
          <h1 className="text-4xl font-medium tracking-tight">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-[#6B7280]">{description}</p>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
              <h3 className="font-medium">Estado</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Módulo listo para conectar.</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
              <h3 className="font-medium">Automatización</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Próximamente conectado con ALMA.</p>
            </div>
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6">
              <h3 className="font-medium">Plan</h3>
              <p className="mt-2 text-sm text-[#6B7280]">Disponible según suscripción.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ModulePage;
