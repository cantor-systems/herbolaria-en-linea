import Link from 'next/link';
import { User, Package, MapPin, Heart, ShieldCheck, Truck } from 'lucide-react';

export default function AccountPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="bg-[#285F50] text-[#FAF7E8] p-6 sm:p-8 rounded-3xl shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D17B24] text-white flex items-center justify-center font-black text-xl shadow-sm">
            MH
          </div>
          <div>
            <span className="text-xs font-bold text-[#AFC28E] uppercase tracking-wider block">
              Mi Cuenta Cliente
            </span>
            <h1 className="text-2xl font-extrabold">Bienvenido a Herbolaria en Línea</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#FAF7E8] p-5 rounded-2xl border border-[#D9D1B9] space-y-2">
          <Package className="w-6 h-6 text-[#285F50]" />
          <h3 className="font-extrabold text-[#23312C] text-sm">Mis Pedidos Recientes</h3>
          <p className="text-xs text-[#6F8F69]">Consulta el historial de tus compras.</p>
          <Link href="/rastrear-pedido" className="text-xs font-bold text-[#285F50] hover:underline block pt-2">
            Ver Rastreo de Pedidos →
          </Link>
        </div>

        <div className="bg-[#FAF7E8] p-5 rounded-2xl border border-[#D9D1B9] space-y-2">
          <MapPin className="w-6 h-6 text-[#285F50]" />
          <h3 className="font-extrabold text-[#23312C] text-sm">Direcciones Guardadas</h3>
          <p className="text-xs text-[#6F8F69]">Gestiona tus domicilios de envío para México.</p>
        </div>

        <div className="bg-[#FAF7E8] p-5 rounded-2xl border border-[#D9D1B9] space-y-2">
          <ShieldCheck className="w-6 h-6 text-[#285F50]" />
          <h3 className="font-extrabold text-[#23312C] text-sm">Soporte y Asistencia</h3>
          <p className="text-xs text-[#6F8F69]">Atención rápida personalizada vía WhatsApp.</p>
          <Link href="/contacto" className="text-xs font-bold text-[#285F50] hover:underline block pt-2">
            Ir a Contacto →
          </Link>
        </div>
      </div>
    </div>
  );
}
