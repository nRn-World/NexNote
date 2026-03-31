import React from 'react';
import { X, Shield, Lock, Eye, Database, Trash2, Mail } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

const sections = [
  {
    icon: <Database size={18} className="text-indigo-400" />,
    title: 'Vilken data vi samlar in',
    content: [
      'Kontouppgifter: namn och e-postadress via Google Sign-In.',
      'Anteckningar: titel, innehåll, bifogade filer och kodredigerarens innehåll.',
      'Community-data: inlägg du delar, likes, följare/följer-relationer och profilbild.',
      'Teknisk data: tidsstämplar för skapande och uppdatering av anteckningar.',
    ],
  },
  {
    icon: <Eye size={18} className="text-blue-400" />,
    title: 'Hur vi använder din data',
    content: [
      'Dina anteckningar används uteslutande för att tillhandahålla tjänsten åt dig.',
      'Community-inlägg du väljer att dela är synliga för alla inloggade användare.',
      'Vi säljer, hyr ut eller delar aldrig din data med tredje part i marknadsföringssyfte.',
      'Data används inte för profilering, reklam eller automatiserat beslutsfattande.',
    ],
  },
  {
    icon: <Lock size={18} className="text-green-400" />,
    title: 'Lagring och säkerhet',
    content: [
      'All data lagras säkert i Google Firebase (Firestore och Storage). Lagringsregion beror på Firebase-projektets konfiguration.',
      'Kommunikation sker alltid via krypterad HTTPS-anslutning.',
      'Åtkomst till din data skyddas av Firebase Security Rules — endast du kan läsa och skriva dina egna anteckningar.',
      'Profilbilder och bifogade filer lagras i Firebase Storage med åtkomstkontroll per användare.',
    ],
  },
  {
    icon: <Shield size={18} className="text-purple-400" />,
    title: 'Dina rättigheter',
    content: [
      'Rätt till tillgång: du kan när som helst se all din data i appen.',
      'Rätt till radering: du kan ta bort enskilda anteckningar direkt i appen. Kontakta oss för att radera hela ditt konto.',
      'Rätt till portabilitet: dina anteckningar kan kopieras och exporteras manuellt.',
      'Rätt att invända: du kan när som helst sluta använda tjänsten och begära att din data raderas.',
    ],
  },
  {
    icon: <Trash2 size={18} className="text-red-400" />,
    title: 'Datalagring och radering',
    content: [
      'Dina anteckningar lagras så länge ditt konto är aktivt.',
      'Community-inlägg du delar kan inte tas bort av dig själv — kontakta admin för borttagning.',
      'Vid kontoborttagning raderas alla dina anteckningar, filer och personuppgifter inom 30 dagar.',
    ],
  },
  {
    icon: <Mail size={18} className="text-amber-400" />,
    title: 'Kontakt',
    content: [
      'Har du frågor om din data eller vill utöva dina rättigheter? Kontakta oss på: bynrnworld@gmail.com',
      'Vi svarar inom 5 arbetsdagar.',
    ],
  },
];

export default function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Shield size={16} className="text-indigo-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Integritetspolicy</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">NexNote · Senast uppdaterad: April 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Intro */}
        <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-500/5 border-b border-indigo-100 dark:border-indigo-500/10">
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            NexNote värnar om din integritet. Den här policyn förklarar vilken data vi samlar in, hur vi använder den och vilka rättigheter du har. Vi följer GDPR och EU:s dataskyddslagstiftning.
          </p>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {sections.map((section, i) => (
            <div key={i}>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  {section.icon}
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{section.title}</h3>
              </div>
              <ul className="space-y-2 pl-9">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <span className="w-1 h-1 rounded-full bg-zinc-400 dark:bg-zinc-600 mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-400">© 2026 NexNote. Alla rättigheter förbehållna.</p>
          <button onClick={onClose} className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
