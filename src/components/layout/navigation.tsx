"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timer, Calendar, TrendingUp, Settings, LogOut, Download, BarChart3 } from "lucide-react";
import NaturalLanguageInput from "@/components/ui/natural-language-input";
import { hasManagerAccess } from "@/lib/auth-utils";
import { Logo } from "@/components/ui/logo";

export function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) return null;

  const user = session.user;
  const isManager = hasManagerAccess(user.role);

  const navigationItems = [
    {
      id: "track",
      label: "Track",
      href: "/track",
      icon: Timer,
      description: "Timer & time entry",
    },
    {
      id: "plan",
      label: "Plan", 
      href: "/plan",
      icon: Calendar,
      description: "Resource planning",
      requiresManager: true,
    },
    {
      id: "profit",
      label: "Profit",
      href: "/profit", 
      icon: TrendingUp,
      description: "Project profitability",
      requiresManager: true,
    },
    {
      id: "reports",
      label: "Reports",
      href: "/reports",
      icon: BarChart3,
      description: "Reports & analytics",
      requiresManager: true,
    },
  ];

  const getCurrentTab = () => {
    if (pathname.startsWith("/track")) return "track";
    if (pathname.startsWith("/plan")) return "plan";
    if (pathname.startsWith("/profit")) return "profit";
    if (pathname.startsWith("/reports")) return "reports";
    return "track";
  };

  return (
    <div className="border-b bg-white">
      {/* Desktop Navigation */}
      <div className="hidden lg:flex h-16 items-center px-6">
        <div className="flex items-center space-x-4 mr-6">
          <Link href="/track" className="flex items-center space-x-2">
            <Logo />
          </Link>
        </div>

        <div className="flex-1 flex justify-center items-center space-x-6">
          <Tabs value={getCurrentTab()} className="w-auto">
            <TabsList className="h-8 w-fit">
              {navigationItems.map((item) => {
                if (item.requiresManager && !isManager) return null;
                
                const Icon = item.icon;
                return (
                  <TabsTrigger key={item.id} value={item.id} asChild>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 px-3 py-1"
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          
          <NaturalLanguageInput />
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600">
            <div className="font-medium">{user.name || user.email}</div>
            <div className="text-xs capitalize">{user.role}</div>
          </div>
          
          <Button variant="ghost" size="sm" asChild>
            <Link href="/export">
              <Download className="w-4 h-4" />
            </Link>
          </Button>
          
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <Settings className="w-4 h-4" />
            </Link>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/track" className="flex items-center space-x-2">
            <Logo />
          </Link>

          <div className="flex items-center space-x-2">
            <div className="text-right text-sm text-gray-600">
              <div className="font-medium text-xs">{user.name || user.email?.split('@')[0]}</div>
              <div className="text-xs capitalize">{user.role}</div>
            </div>
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/export">
                <Download className="w-4 h-4" />
              </Link>
            </Button>
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <Settings className="w-4 h-4" />
              </Link>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="border-t bg-white">
          <div className="flex">
            {navigationItems.map((item) => {
              if (item.requiresManager && !isManager) return null;
              
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center py-3 px-2 text-xs transition-colors ${
                    isActive 
                      ? "text-black bg-gray-50 border-t-2 border-black" 
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
        
        {/* Natural Language Input - Full Width on Mobile */}
        <div className="p-4 bg-gray-50 border-t">
          <NaturalLanguageInput />
        </div>
      </div>
    </div>
  );
}
