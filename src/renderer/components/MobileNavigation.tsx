import React, { useState } from 'react';
import { Camera, Home, MoreHorizontal, Utensils, Dumbbell, Scale, Calculator, TrendingUp, SlidersHorizontal, UserRound } from 'lucide-react';

interface MobileNavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

const items = [
  { id: 'dashboard', label: 'Início', icon: Home },
  { id: 'nutrition', label: 'Nutrição', icon: Utensils },
  { id: 'workouts', label: 'Treino', icon: Dumbbell },
  { id: 'shape', label: 'Shape', icon: Camera },
  { id: 'more', label: 'Mais', icon: MoreHorizontal }
];

const extraItems = [
  { id: 'profile', label: 'Perfil & Metas', icon: UserRound },
  { id: 'weight', label: 'Histórico de peso', icon: Scale },
  { id: 'calculator', label: 'Calculadora metabólica', icon: Calculator },
  { id: 'projection', label: 'Projeção física', icon: TrendingUp },
  { id: 'customization', label: 'Personalização visual', icon: SlidersHorizontal }
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ currentTab, onSelectTab }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const extraActive = extraItems.some(item => item.id === currentTab);

  return (
    <nav aria-label="Navegação principal" className="mobile-navigation fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 px-2 pt-2 backdrop-blur-xl">
      {moreOpen && (
        <div className="absolute inset-x-3 bottom-full mb-2 rounded-2xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
          {extraItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => { onSelectTab(id); setMoreOpen(false); }}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors ${currentTab === id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'}`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {items.map(({ id, label, icon: Icon }) => {
          const active = id === 'more' ? extraActive : currentTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active && id !== 'more' ? 'page' : undefined}
              aria-expanded={id === 'more' ? moreOpen : undefined}
              aria-label={label}
              onClick={() => id === 'more' ? setMoreOpen(open => !open) : onSelectTab(id)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors active:scale-95 ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
