'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { JobInventoryAllocation, Inventory } from '@/lib/types/database.types';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function JobInventoryAllocationPage() {
  const params = useParams();
  const jobId = params.id as string;

  const [allocations, setAllocations] = useState<any[]>([]);
  const [availableInventory, setAvailableInventory] = useState<Inventory[]>([]);
  const [inventorySearch, setInventorySearch] = useState('');
  const [filteredInventory, setFilteredInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchAllocations();
    fetchAvailableInventory();
  }, [jobId]);

  useEffect(() => {
    // Filter inventory based on search
    if (inventorySearch) {
      const search = inventorySearch.toLowerCase();
      setFilteredInventory(
        availableInventory.filter(item =>
          item.item_name.toLowerCase().includes(search) ||
          (item.sku && item.sku.toLowerCase().includes(search)) ||
          (item.description && item.description.toLowerCase().includes(search)) ||
          (item.category && item.category.toLowerCase().includes(search))
        )
      );
    } else {
      setFilteredInventory(availableInventory);
    }
  }, [inventorySearch, availableInventory]);

  const fetchAllocations = async () => {
    const { data, error } = await supabase
      .from('job_inventory_allocations')
      .select(`
        *,
        inventory (
          id,
          item_name,
          sku,
          unit,
          quantity,
          unit_cost
        )
      `)
      .eq('job_id', jobId)
      .order('allocated_at', { ascending: false });

    if (error) {
      console.error('Error fetching allocations:', error);
    } else {
      setAllocations(data || []);
    }
  };

  const fetchAvailableInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .gt('quantity', 0)
      .order('item_name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error);
    } else {
      setAvailableInventory(data || []);
    }
    setLoading(false);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) return;

    const selectedItem = availableInventory.find(i => i.id === selectedInventory);
    if (!selectedItem) return;

    const allocatedQty = parseFloat(quantity);
    if (allocatedQty > selectedItem.quantity) {
      alert('Cannot allocate more than available quantity');
      return;
    }

    // Insert allocation
    const { error: allocError } = await supabase
      .from('job_inventory_allocations')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        job_id: jobId,
        inventory_id: selectedInventory,
        quantity_allocated: allocatedQty,
        notes: notes || null,
      });

    if (allocError) {
      alert('Error allocating inventory: ' + allocError.message);
      return;
    }

    // Update inventory quantity
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ quantity: selectedItem.quantity - allocatedQty })
      .eq('id', selectedInventory);

    if (updateError) {
      alert('Error updating inventory: ' + updateError.message);
    } else {
      setShowModal(false);
      setSelectedInventory('');
      setQuantity('');
      setNotes('');
      fetchAllocations();
      fetchAvailableInventory();
    }
  };

  const handleReturn = async (allocation: any) => {
    if (!confirm('Return this inventory to stock?')) return;

    // Update inventory quantity (return the allocated quantity)
    const { error: updateError } = await supabase
      .from('inventory')
      .update({ 
        quantity: allocation.inventory.quantity + allocation.quantity_allocated 
      })
      .eq('id', allocation.inventory_id);

    if (updateError) {
      alert('Error returning inventory: ' + updateError.message);
      return;
    }

    // Delete allocation
    const { error: deleteError } = await supabase
      .from('job_inventory_allocations')
      .delete()
      .eq('id', allocation.id);

    if (deleteError) {
      alert('Error removing allocation: ' + deleteError.message);
    } else {
      fetchAllocations();
      fetchAvailableInventory();
    }
  };

  const getMaxQuantity = () => {
    const item = availableInventory.find(i => i.id === selectedInventory);
    return item?.quantity || 0;
  };

  const totalAllocatedValue = allocations.reduce((sum, alloc) => {
    const cost = alloc.inventory?.unit_cost || 0;
    return sum + (alloc.quantity_allocated * cost);
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
      <div className="mb-8">
        <Link href={`/jobs/${jobId}`} className="text-primary hover:text-primary-hover mb-4 inline-block">
          ← Back to Job
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Allocation</h1>
            <p className="text-gray-600 mt-2">Manage inventory items allocated to this job</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            + Allocate Inventory
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Items Allocated</div>
          <div className="text-3xl font-bold text-gray-900">{allocations.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Allocated Value</div>
          <div className="text-3xl font-bold text-green-600">${totalAllocatedValue.toFixed(2)}</div>
        </div>
      </div>

      {/* Allocations List */}
      {allocations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No inventory allocated</h2>
          <p className="text-gray-600 mb-6">
            Start allocating inventory items to this job
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
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allocated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {allocation.inventory?.item_name || 'Unknown'}
                      </div>
                      {allocation.notes && (
                        <div className="text-sm text-gray-500">{allocation.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {allocation.inventory?.sku || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {allocation.quantity_allocated} {allocation.inventory?.unit}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${(allocation.inventory?.unit_cost || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600">
                        ${(allocation.quantity_allocated * (allocation.inventory?.unit_cost || 0)).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(allocation.allocated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleReturn(allocation)}
                        className="text-primary hover:text-primary-hover"
                      >
                        Return to Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Allocation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Allocate Inventory to Job
              </h2>

              <form onSubmit={handleAllocate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Inventory
                  </label>
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Search by name, SKU, description, or category..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Item * ({filteredInventory.length} items available)
                  </label>
                  <select
                    required
                    value={selectedInventory}
                    onChange={(e) => {
                      setSelectedInventory(e.target.value);
                      setQuantity('');
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    size={Math.min(filteredInventory.length + 1, 8)}
                  >
                    <option value="">Choose an item...</option>
                    {filteredInventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.item_name} {item.sku && `(${item.sku})`} - Available: {item.quantity} {item.unit}
                        {item.unit_cost && ` @ $${item.unit_cost.toFixed(2)}`}
                      </option>
                    ))}
                  </select>
                  {filteredInventory.length === 0 && inventorySearch && (
                    <p className="text-sm text-gray-500 mt-1">
                      No items match your search. Try a different search term.
                    </p>
                  )}
                  {filteredInventory.length === 0 && !inventorySearch && (
                    <p className="text-sm text-orange-600 mt-1">
                      No inventory items with available stock.
                    </p>
                  )}
                </div>

                {selectedInventory && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity * (Max: {getMaxQuantity()})
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      max={getMaxQuantity()}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Optional notes about this allocation"
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedInventory('');
                      setQuantity('');
                      setNotes('');
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
                  >
                    Allocate
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
