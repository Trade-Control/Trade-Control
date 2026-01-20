import { getInventoryItems } from '@/actions/inventory'
import Link from 'next/link'

export default async function InventoryPage() {
  const items = await getInventoryItems()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <Link
          href="/inventory/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
        >
          Add Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory items</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first inventory item.
          </p>
          <div className="mt-6">
            <Link
              href="/inventory/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-blue-700"
            >
              Add Item
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {items.map((item: any) => (
              <li key={item.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                      {item.sku && <span className="ml-2 text-gray-500">({item.sku})</span>}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    )}
                    {item.location && (
                      <p className="mt-1 text-xs text-gray-400">Location: {item.location}</p>
                    )}
                  </div>
                  <div className="ml-4 flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Qty: {item.quantity}</p>
                      {item.unit_cost && (
                        <p className="text-xs text-gray-500">${item.unit_cost} each</p>
                      )}
                    </div>
                    {item.reorder_level && item.quantity <= item.reorder_level && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Low Stock
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
