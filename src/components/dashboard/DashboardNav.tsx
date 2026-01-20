'use client'

import Link from 'next/link'
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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', roles: ['owner', 'management', 'field_staff'] },
    { name: 'Jobs', href: '/jobs', roles: ['owner', 'management'] },
    { name: 'My Jobs', href: '/my-jobs', roles: ['field_staff'] },
    { name: 'Contacts', href: '/contacts', roles: ['owner', 'management'] },
    { name: 'Inventory', href: '/inventory', roles: ['owner', 'management'] },
    { name: 'Contractors', href: '/contractors', roles: ['owner', 'management'] },
    { name: 'Travel', href: '/travel-tracking', roles: ['owner', 'management', 'field_staff'] },
    { name: 'Reports', href: '/reports', roles: ['owner', 'management', 'field_staff'] },
  ]

  const ownerNav = [
    { name: 'Licenses', href: '/licenses' },
    { name: 'Subscription', href: '/subscription/manage' },
    { name: 'Audit Trail', href: '/audit' },
    { name: 'Settings', href: '/settings' },
  ]

  const filteredNav = navigation.filter((item) => item.roles.includes(user.role))

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-primary">
                Trade Control
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {filteredNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'border-primary text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="ml-3 relative">
              <div>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                </button>
              </div>
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b">
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1">{user.role}</p>
                  </div>
                  {user.role === 'owner' && (
                    <>
                      {ownerNav.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setShowUserMenu(false)}
                        >
                          {item.name}
                        </Link>
                      ))}
                      <div className="border-t"></div>
                    </>
                  )}
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
    </nav>
  )
}
