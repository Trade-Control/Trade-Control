import { getContacts } from '@/actions/contacts'
import Link from 'next/link'

export default async function ContactsPage() {
  const contacts = await getContacts()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <Link
          href="/contacts/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
        >
          Add Contact
        </Link>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a customer or supplier.
          </p>
          <div className="mt-6">
            <Link
              href="/contacts/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
            >
              Add Contact
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link href={`/contacts/${contact.id}`} className="block hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-primary truncate">
                          {contact.name}
                          {contact.company && ` - ${contact.company}`}
                        </p>
                        <div className="mt-1 flex items-center space-x-4">
                          {contact.email && (
                            <p className="text-sm text-gray-500">{contact.email}</p>
                          )}
                          {contact.phone && (
                            <p className="text-sm text-gray-500">{contact.phone}</p>
                          )}
                        </div>
                        {contact.address && (
                          <p className="mt-1 text-sm text-gray-500">
                            {contact.address}
                            {contact.city && `, ${contact.city}`}
                            {contact.state && ` ${contact.state}`}
                            {contact.postcode && ` ${contact.postcode}`}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            contact.type === 'customer'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {contact.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
