'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface DashboardNavProps {
  user: {
    firstName: string
    lastName: string
    role: string
    email: string
  }
}

export default function DashboardNav({ user }: DashboardNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['owner', 'management', 'field_staff'] },
    { name: 'Jobs', href: '/jobs', icon: '💼', roles: ['owner', 'management'] },
    { name: 'My Jobs', href: '/my-jobs', icon: '📋', roles: ['field_staff'] },
    { name: 'Contacts', href: '/contacts', icon: '👥', roles: ['owner', 'management'] },
    { name: 'Quotes', href: '/quotes', icon: '📄', roles: ['owner', 'management'] },
    { name: 'Invoices', href: '/invoices', icon: '🧾', roles: ['owner', 'management'] },
    { name: 'Inventory', href: '/inventory', icon: '📦', roles: ['owner', 'management'] },
    { name: 'Contractors', href: '/contractors', icon: '🔧', roles: ['owner', 'management'] },
    { name: 'Travel', href: '/travel-tracking', icon: '🚗', roles: ['owner', 'management', 'field_staff'] },
    { name: 'Reports', href: '/reports', icon: '📈', roles: ['owner', 'management', 'field_staff'] },
  ]

  const ownerNav = [
    { name: 'Licenses', href: '/licenses', icon: '🎫' },
    { name: 'Subscription', href: '/subscription/manage', icon: '💳' },
    { name: 'Audit Trail', href: '/audit', icon: '📜' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ]

  const filteredNav = navigation.filter((item) => item.roles.includes(user.role))

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/logo.png" alt="Trade Control" width={120} height={30} className="h-8 w-auto" />
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center" onClick={() => setIsMobileMenuOpen(false)}>
              <Image src="/logo.png" alt="Trade Control" width={150} height={40} className="h-8 w-auto" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <div className="space-y-1">
              {filteredNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Owner Navigation */}
            {user.role === 'owner' && (
              <>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Administration
                  </p>
                  <div className="space-y-1">
                    {ownerNav.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                            isActive
                              ? 'bg-primary text-white'
                              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <span className="mr-3 text-lg">{item.icon}</span>
                          {item.name}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200 p-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center w-full text-left hover:bg-gray-50 rounded-md p-2 transition-colors"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate capitalize">{user.role}</p>
                </div>
                <svg
                  className={`flex-shrink-0 ml-2 h-5 w-5 text-gray-400 transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
