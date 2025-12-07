"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  Home,
  Users,
  Mail,
  Activity,
  Settings,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Sequences", href: "/sequences", icon: Mail },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  workspaceName?: string;
}

export function AppShell({ children, workspaceName }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0 px-4">
            <Send className="w-8 h-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">
              InboxPilot
            </span>
          </div>

          {/* Workspace name */}
          {workspaceName && (
            <div className="px-4 mt-4">
              <div className="px-3 py-2 text-sm font-medium text-gray-500 bg-gray-100 rounded-md">
                {workspaceName}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 mt-6 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive
                        ? "text-blue-600"
                        : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User button at bottom */}
          <div className="flex items-center p-4 border-t">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
            <span className="ml-3 text-sm font-medium text-gray-700">
              Account
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b">
          <div className="flex items-center">
            <Send className="w-6 h-6 text-blue-600" />
            <span className="ml-2 text-lg font-bold text-gray-900">
              InboxPilot
            </span>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>

        {/* Mobile navigation */}
        <div className="md:hidden flex overflow-x-auto bg-white border-b px-4 py-2 space-x-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap",
                  isActive
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-4 h-4 mr-1" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
