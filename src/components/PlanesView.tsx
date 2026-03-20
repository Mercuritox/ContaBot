import { useState, useEffect } from "react";
import { Check, Zap, Crown, Loader2, Star, ArrowLeft } from "lucide-react";

interface PlanesViewProps {
  userId: string;
  onBack?: () => void;
}

const PRICE_ID_MENSUAL = import.meta.env.VITE_PRICE_ID_MENSUAL || "";
const PRICE_ID_ANUAL = import.meta.env.VITE_PRICE_ID_ANUAL || "";

const beneficiosPremium = [
  "Análisis inteligente con IA — resúmenes y recomendaciones personalizadas",
  "Fotos de tickets ilimitadas",
  "Movimientos por audio ilimitados",
  "Gráficas precisas",
  "Objetivos dinámicos",
  "Registros ilimitados",
  "Exportación de datos en PDF y Excel",
  "Sin anuncios",
  "Acceso anticipado a nuevas funciones",
  "Soporte prioritario por WhatsApp / Email",
];

const beneficiosFree = [
  "Registros ilimitados",
  "Gráficas precisas",
  "Objetivos dinámicos",
  "5 fotos de tickets por mes",
  "5 usos de audio por mes",
  "Soporte por email",
];

export default function PlanesView({ userId, onBack }: PlanesViewProps) {
  const [billingPeriod, setBillingPeriod] = useState<"mensual" | "anual">("anual");
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch(`/api/user/subscription/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setIsPremium(data.isPremium);
          setPremiumUntil(data.premiumUntil);
        }
      } catch (e) {
        console.error("Error fetching subscription:", e);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchSubscription();
    else setLoading(false);
  }, [userId]);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          planType: billingPeriod, // "mensual" o "anual"
          userId 
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "No se pudo crear la sesión de pago");
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de pago no recibida");
      }
    } catch (e: any) {
      setError(e.message || "Error al procesar el pago");
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3 bg-gray-50 dark:bg-gray-950 sticky top-0 z-10">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all text-gray-500">
            <ArrowLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Elige tu plan</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Cancela cuando quieras</p>
        </div>
      </div>

      <div className="flex-1 px-4 pb-10 pt-2 flex flex-col gap-4 max-w-lg mx-auto w-full">

        {/* Banner Premium activo */}
        {isPremium && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <Crown size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">¡Ya eres Premium! 🎉</p>
              {premiumUntil && (
                <p className="text-xs text-emerald-600 dark:text-emerald-500 truncate">
                  Activo hasta: {new Date(premiumUntil).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                fetch(`/api/user/subscription/${userId}`)
                  .then(r => r.json())
                  .then(data => {
                    setIsPremium(data.isPremium);
                    setPremiumUntil(data.premiumUntil);
                  });
              }}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
            >
              Actualizar
            </button>
          </div>
        )}

        {/* Toggle billing */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
          <button
            onClick={() => setBillingPeriod("mensual")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${billingPeriod === "mensual" ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingPeriod("anual")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${billingPeriod === "anual" ? "bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400" : "text-gray-500"}`}
          >
            Anual
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">-25%</span>
          </button>
        </div>

        {/* Plan PRO — protagonista */}
        <div className="relative bg-emerald-600 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/30">
          {/* Círculos decorativos */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative p-6">
            {/* Badge popular */}
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              <Star size={10} fill="white" />
              Más popular
            </div>

            {/* Precio */}
            <div className="flex items-end gap-2 mb-1">
              <span className="text-5xl font-black text-white">
                ${billingPeriod === "anual" ? "59" : "79"}
              </span>
              <span className="text-emerald-200 text-sm font-medium mb-2">/mes</span>
            </div>
            {billingPeriod === "anual" && (
              <p className="text-emerald-200 text-xs font-medium mb-4">$708 al año · Ahorras $240</p>
            )}

            <p className="text-white font-bold text-lg mb-1">ContaBot Pro</p>
            <p className="text-emerald-100 text-xs font-normal mb-6">Todo incluido, sin límites</p>

            {/* Beneficios */}
            <div className="flex flex-col gap-2.5 mb-6">
              {beneficiosPremium.map((b) => (
                <div key={b} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check size={9} className="text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-white/90 font-normal leading-snug">{b}</span>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-3 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-white text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* CTA */}
            {isPremium ? (
              <div className="w-full py-4 rounded-2xl bg-white/20 text-center text-white font-bold text-sm">
                ✅ Plan activo
              </div>
            ) : (
              <button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="w-full py-4 rounded-2xl bg-white text-emerald-600 font-bold text-sm shadow-lg active:scale-[0.98] transition-all hover:shadow-xl disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {checkoutLoading ? (
                  <><Loader2 size={16} className="animate-spin" />Procesando...</>
                ) : (
                  <>{billingPeriod === "mensual" ? "Suscribirme por $79/mes" : "Suscribirme por $59/mes"}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Plan Gratuito — discreto */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">Plan Gratuito</p>
              <p className="text-xs text-gray-400 font-normal">Para empezar a organizarte</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-gray-900 dark:text-white">$0</span>
              <span className="text-xs text-gray-400"> /mes</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {beneficiosFree.map((b) => (
              <div key={b} className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="w-3.5 h-3.5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                  <Check size={8} className="text-gray-400" />
                </div>
                {b}
              </div>
            ))}
          </div>
          {!isPremium && (
            <div className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-xs font-semibold text-gray-400">
              Plan actual
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-600">
          🔒 Pago seguro procesado por Stripe
        </p>
      </div>
    </div>
  );
}
