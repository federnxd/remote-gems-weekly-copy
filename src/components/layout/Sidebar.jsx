import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, PenTool, Briefcase, CalendarDays, 
  Target, BarChart3, Lightbulb, Menu, X, Megaphone, TrendingUp, History,
  Pause, Play, ChevronDown, ChevronRight, Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// Platform icons as inline SVG components
const LinkedInIcon = () => <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
const TwitterIcon = () => <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.735-8.84L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const FacebookIcon = () => <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="#1877f2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
const InstagramIcon = () => <svg viewBox="0 0 24 24" className="w-3.5 h-3.5"><defs><linearGradient id="sb-ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433"/><stop offset="50%" stopColor="#dc2743"/><stop offset="100%" stopColor="#bc1888"/></linearGradient></defs><path fill="url(#sb-ig)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
const ThreadsIcon = () => <svg viewBox="0 0 192 192" className="w-3.5 h-3.5" fill="black"><path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60354 125.202 0.195326 97.0695 0H96.9569C68.8816 0.19487 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.805 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"/></svg>;
const BlueSkyIcon = () => <svg viewBox="0 0 568 501" className="w-3.5 h-3.5" fill="#0085ff"><path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.209C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.708 473.333 453.32c-119.86 122.992-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.612-33.889-129.52 80.654-149.07-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.66 0 75.293 0 57.947 0-28.906 76.135-1.611 123.121 33.664Z"/></svg>;
const MastodonIcon = () => <svg viewBox="0 0 216.4 232" className="w-3.5 h-3.5" fill="#563acc"><path d="M211.8 139.7c-2.9 15.1-26.2 31.7-53 35-14 1.7-27.7 3.2-42.4 2.5-24-.9-43-5-43-5 0 2 .1 4 .4 5.8 2.9 22.2 21.8 23.6 39.7 24.2 18 .6 34-4.4 34-4.4l.7 16.3s-12.6 6.7-35 7.9c-12.3.7-27.7-.3-45.5-4.8C27.4 206.5 4.7 171 1.3 131.4 0 118.2.7 105 .7 105 0 54.9 32.2 40 32.2 40c16.2-7.4 44-10.5 73-10.7h.7c29 .2 56.9 3.3 73 10.7 0 0 32.2 14.9 32.2 65 0 0 .4 37.3-5.3 64.7z"/><path d="M178.3 81.6v56.4h-22.3V83.3c0-11.5-4.8-17.4-14.5-17.4-10.7 0-16 6.9-16 20.6v29.9h-22.2V86.5c0-13.7-5.4-20.6-16-20.6-9.7 0-14.5 5.9-14.5 17.4v54.7H50.5V81.6c0-11.5 2.9-20.6 8.8-27.3 6-6.7 13.9-10.1 23.7-10.1 11.3 0 19.9 4.3 25.5 13l5.5 9.2 5.5-9.2c5.7-8.7 14.2-13 25.5-13 9.8 0 17.7 3.4 23.7 10.1 5.9 6.7 8.6 15.8 8.6 27.3z" fill="#fff"/></svg>;

const platformSubItems = [
  { path: '/platforms/linkedin', icon: LinkedInIcon, label: 'LinkedIn' },
  { path: '/platforms/twitter', icon: TwitterIcon, label: 'X / Twitter' },
  { path: '/platforms/facebook', icon: FacebookIcon, label: 'Facebook' },
  { path: '/platforms/instagram', icon: InstagramIcon, label: 'Instagram' },
  { path: '/platforms/threads', icon: ThreadsIcon, label: 'Threads' },
  { path: '/platforms/bluesky', icon: BlueSkyIcon, label: 'Bluesky' },
  { path: '/platforms/mastodon', icon: MastodonIcon, label: 'Mastodon' },
];

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
  { path: '/planner', icon: Brain, label: 'DataAnalystPlanner' },
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const location = useLocation();
  const [isRunning, setIsRunning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isPlatformRoute = location.pathname.startsWith('/platforms');
  const [platformsOpen, setPlatformsOpen] = useState(isPlatformRoute);

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
          {/* Main Dashboard link */}
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              location.pathname === '/'
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>

          {/* Platforms sub-menu */}
          <div>
            <button
              onClick={() => setPlatformsOpen(!platformsOpen)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isPlatformRoute
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">Platforms</span>
              {platformsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {platformsOpen && (
              <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
                {platformSubItems.map(({ path, icon: PlatIcon, label }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <PlatIcon />
                      {label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rest of nav items (skip Dashboard since it's above) */}
          {navItems.slice(1).map(({ path, icon: Icon, label }) => {
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