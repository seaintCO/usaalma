export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F7F8] px-6 text-[#111111]">
      <div className="w-full max-w-md rounded-[2rem] border border-[#E5E7EB] bg-white p-8 shadow-xl shadow-black/5">
        <div className="mb-8 text-center">
          <div className="text-2xl font-medium tracking-tight">ALMA</div>
          <div className="text-xs text-[#6B7280]">Powered by SEAINT</div>
        </div>

        <h1 className="mb-2 text-2xl font-medium tracking-tight">Iniciar sesión</h1>
        <p className="mb-8 text-sm text-[#6B7280]">Entra a tu sistema operativo personal y empresarial.</p>

        <form className="space-y-4">
          <input className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]" placeholder="Correo electrónico" type="email" />
          <input className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 outline-none focus:border-[#2563EB]" placeholder="Contraseña" type="password" />
          <button className="w-full rounded-xl bg-black py-3 font-medium text-white">Entrar</button>
        </form>

        <div className="mt-6 flex justify-between text-sm text-[#6B7280]">
          <a href="/forgot-password" className="hover:text-black">Olvidé mi contraseña</a>
          <a href="/signup" className="hover:text-black">Crear cuenta</a>
        </div>
      </div>
    </main>
  );
}
