'use client';

import { useEffect, useState } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { Inventory } from '@/lib/types/database.types';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Inventory | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const supabase = useSafeSupabaseClient();

  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    sku: '',
    quantity: '',
    unit: 'each',
    unit_cost: '',
    location: '',
    category: '',
    reorder_level: '',
  });

  useEffect(() => {
    if (supabase) {
      fetchInventory();
    }
  }, [supabase]);

  const fetchInventory = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setInventory(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    const inventoryData = {
      item_name: formData.item_name,
      description: formData.description || null,
      sku: formData.sku || null,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
      location: formData.location || null,
      category: formData.category || null,
      reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : null,
    };

    if (editingItem) {
      const { error } = await supabase
        .from('inventory')
        .update(inventoryData)
        .eq('id', editingItem.id);

      if (error) {
        alert('Error updating inventory item: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchInventory();
      }
    } else {
      const { error } = await supabase
        .from('inventory')
        .insert({
          ...inventoryData,
          organization_id: profile.organization_id,
          created_by: user.id,
        });

      if (error) {
        alert('Error creating inventory item: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchInventory();
      }
    }
  };

  const handleEdit = (item: Inventory) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      description: item.description || '',
      sku: item.sku || '',
      quantity: item.quantity.toString(),
      unit: item.unit,
      unit_cost: item.unit_cost?.toString() || '',
      location: item.location || '',
      category: item.category || '',
      reorder_level: item.reorder_level?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;

    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting inventory item: ' + error.message);
    } else {
      fetchInventory();
    }
  };

  const adjustQuantity = async (id: string, currentQuantity: number, adjustment: number) => {
    const newQuantity = Math.max(0, currentQuantity + adjustment);
    const { error } = await supabase
      .from('inventory')
      .update({ quantity: newQuantity })
      .eq('id', id);

    if (error) {
      alert('Error adjusting quantity: ' + error.message);
    } else {
      fetchInventory();
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      item_name: '',
      description: '',
      sku: '',
      quantity: '',
      unit: 'each',
      unit_cost: '',
      location: '',
      category: '',
      reorder_level: '',
    });
  };

  const categories = Array.from(new Set(inventory.map((item: any) => item.category).filter(Boolean)));

  const isLowStock = (item: Inventory) => {
    return item.reorder_level !== null && item.quantity <= item.reorder_level;
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesLowStock = !filterLowStock || isLowStock(item);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const totalValue = filteredInventory.reduce((sum, item) => {
    return sum + (item.quantity * (item.unit_cost || 0));
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-2">Track your stock and materials</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Items</div>
          <div className="text-3xl font-bold text-gray-900">{filteredInventory.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Low Stock Items</div>
          <div className="text-3xl font-bold text-orange-600">
            {inventory.filter(isLowStock).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Value</div>
          <div className="text-3xl font-bold text-green-600">${totalValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category as string}>{category}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => setFilterLowStock(!filterLowStock)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filterLowStock
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Low Stock Only
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No inventory items found</h2>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterCategory !== 'all' || filterLowStock
              ? 'Try adjusting your search or filter criteria'
              : 'Start tracking your inventory by adding your first item'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 ${
                      isLowStock(item) ? 'bg-orange-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.item_name}
                            {isLowStock(item) && (
                              <span className="ml-2 text-orange-600" title="Low stock">⚠️</span>
                            )}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500">{item.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.category ? (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.location || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => adjustQuantity(item.id, item.quantity, -1)}
                          className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className={`font-bold min-w-[80px] text-center ${
                          isLowStock(item) ? 'text-orange-600' : 'text-gray-900'
                        }`}>
                          {item.quantity} {item.unit}
                        </span>
                        <button
                          onClick={() => adjustQuantity(item.id, item.quantity, 1)}
                          className="w-7 h-7 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      {isLowStock(item) && (
                        <div className="text-xs text-orange-600 text-center mt-1">
                          Reorder at {item.reorder_level}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {item.unit_cost !== null ? `$${item.unit_cost.toFixed(2)}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-green-600">
                        {item.unit_cost !== null 
                          ? `$${(item.quantity * item.unit_cost).toFixed(2)}`
                          : '-'
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-primary hover:text-primary-hover mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.item_name}
                      onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Stock Keeping Unit"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="each">Each</option>
                      <option value="box">Box</option>
                      <option value="metre">Metre</option>
                      <option value="litre">Litre</option>
                      <option value="kg">Kilogram</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Warehouse A, Shelf 3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., Plumbing, Electrical"
                      list="categories"
                    />
                    {categories.length > 0 && (
                      <datalist id="categories">
                        {categories.map(category => (
                          <option key={category} value={category as string} />
                        ))}
                      </datalist>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Alert when quantity falls below this level"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You'll be alerted when stock falls below this level
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
