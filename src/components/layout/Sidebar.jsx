import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, PenTool, Briefcase, CalendarDays, 
  Target, BarChart3, Lightbulb, Menu, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/generator', icon: PenTool, label: 'Post Generator' },
  { path: '/roles', icon: Briefcase, label: 'Open Roles' },
  { path: '/posts', icon: BarChart3, label: 'My Posts' },
  { path: '/strategy', icon: Target, label: 'Strategy Plan' },
  { path: '/weekly', icon: CalendarDays, label: 'Weekly Planner' },
  { path: '/playbook', icon: Lightbulb, label: 'Referral Playbook' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-40 transition-transform duration-300 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">m1</span>
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight">Referral Engine</h1>
              <p className="text-[11px] text-muted-foreground">micro1 • LinkedIn</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-semibold text-foreground">Goal: 100 hired/mo</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Budget: $50/month</p>
          </div>
        </div>
      </aside>
    </>
  );
}