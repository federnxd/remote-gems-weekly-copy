import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, PenTool, Briefcase, CalendarDays, 
  Target, BarChart3, Lightbulb, Menu, X, Megaphone, TrendingUp, History,
  Pause, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/generator', icon: PenTool, label: 'Post Generator' },
  { path: '/idealab', icon: Lightbulb, label: 'Idea Lab' },
  { path: '/roles', icon: Briefcase, label: 'Open Roles' },
  { path: '/posts', icon: BarChart3, label: 'My Posts' },
  { path: '/analytics', icon: TrendingUp, label: 'Analytics' },
  { path: '/history', icon: History, label: 'Metrics History' },
  { path: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { path: '/calendar', icon: CalendarDays, label: 'Content Calendar' },
  { path: '/strategy', icon: Target, label: 'Strategy Plan' },
  { path: '/weekly', icon: CalendarDays, label: 'Weekly Planner' },
  { path: '/playbook', icon: Lightbulb, label: 'Referral Playbook' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const [isRunning, setIsRunning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check current state on mount for both services
    Promise.all([
      base44.functions.invoke('toggleAutoPosting', { pause: null }),
      base44.functions.invoke('toggleCommunityManaging', { pause: null }),
    ]).then(([autoRes]) => {
      if (autoRes.data?.isRunning !== undefined) {
        setIsRunning(autoRes.data.isRunning);
      }
    }).catch(() => {});
  }, []);

  const handleTogglePause = async () => {
    setIsLoading(true);
    try {
      // Toggle both services together
      const [result] = await Promise.all([
        base44.functions.invoke('toggleAutoPosting', { pause: isRunning }),
        base44.functions.invoke('toggleCommunityManaging', { pause: isRunning }),
      ]);
      setIsRunning(result.data.isRunning);
      toast.success(result.data.message);
    } catch (err) {
      toast.error('Failed to toggle services: ' + err.message);
    }
    setIsLoading(false);
  };

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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <img 
                src="https://media.base44.com/images/public/69fa0f8cf2ee4daa2ecf29f3/463644364_Logo4circle.png" 
                alt="Remote Gems Weekly" 
                className="w-9 h-9 rounded-xl object-cover"
              />
              <div>
                <h1 className="font-bold text-sm tracking-tight">Remote Gems Weekly</h1>
                <p className="text-[11px] text-muted-foreground">LinkedIn Automation</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleTogglePause}
              disabled={isLoading}
              className={cn(
                "h-8 w-8 rounded-lg transition-colors",
                isRunning 
                  ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                  : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              )}
              title={isRunning ? "Pause auto-posting" : "Resume auto-posting"}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isRunning ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
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