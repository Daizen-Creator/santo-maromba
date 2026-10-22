import React from 'react';
import {
  LayoutDashboard,
  Camera,
  Utensils,
  Dumbbell,
  Scale,
  User,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Database,
  TrendingUp,
  SlidersHorizontal,
  BookOpen
} from 'lucide-react';
import appIcon from '../../../assets/santo-maromba-icon.svg';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  profileName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  profileName = 'Atleta'
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'shape', label: 'Calendário do Shape', icon: Camera },
    { id: 'nutrition', label: 'Nutrição & 200 Receitas', icon: Utensils },
    { id: 'workouts', label: 'Treinos & Exercícios', icon: Dumbbell },
    { id: 'weight', label: 'Histórico de Peso', icon: Scale },
    { id: 'profile', label: 'Perfil & Metas', icon: User },
    { id: 'diary', label: 'Diário Pessoal', icon: BookOpen },
    { id: 'calculator', label: 'Calculadora Metabólica', icon: Calculator },
    { id: 'projection', label: 'Projeção Física', icon: TrendingUp },
    { id: 'customization', label: 'Personalização visual', icon: SlidersHorizontal }
  ];

  return (
    <aside
      className={`relative flex flex-col border-r border-border bg-card/60 backdrop-blur-xl transition-all duration-300 ease-in-out z-20 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-primary/10">
              <img src={appIcon} alt="" className="h-full w-full" />
            </div>
            <div className="flex flex-col truncate">
              <span className="font-display text-base font-bold tracking-tight text-foreground">
                Santo<span className="text-primary"> Maromba</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Evolução Baseada em Dados
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/10 shadow-lg shadow-primary/10">
            <img src={appIcon} alt="" className="h-full w-full" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ${
            collapsed ? 'hidden' : 'flex'
          }`}
          title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`h-5 w-5 shrink-0 transition-transform ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* Bottom Status Box */}
      <div className="border-t border-border p-3">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="flex h-10 w-full items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
            title="Expandir barra"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-secondary/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate font-medium">SQLite Local Offline</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 border-t border-border/50 pt-2">
              <span className="truncate font-medium text-foreground">{profileName}</span>
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">v1.0</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
