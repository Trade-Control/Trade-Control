'use client';

import { useEffect, useState, useRef } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { Contact } from '@/lib/types/database.types';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { exportToExcel, importFromExcel } from '@/lib/services/excel-service';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = useSafeSupabaseClient();

  const [formData, setFormData] = useState({
    type: 'customer' as 'customer' | 'supplier',
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    postcode: '',
    abn: '',
    notes: '',
  });

  useEffect(() => {
    if (supabase) {
      fetchContacts();
    }
  }, [supabase]);

  const fetchContacts = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
    } else {
      setContacts(data || []);
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

    if (editingContact) {
      const { error } = await supabase
        .from('contacts')
        .update(formData)
        .eq('id', editingContact.id);

      if (error) {
        alert('Error updating contact: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchContacts();
      }
    } else {
      const { error } = await supabase
        .from('contacts')
        .insert({
          ...formData,
          organization_id: profile.organization_id,
          created_by: user.id,
        });

      if (error) {
        alert('Error creating contact: ' + error.message);
      } else {
        setShowModal(false);
        resetForm();
        fetchContacts();
      }
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      type: contact.type,
      company_name: contact.company_name || '',
      contact_name: contact.contact_name,
      email: contact.email || '',
      phone: contact.phone || '',
      mobile: contact.mobile || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      postcode: contact.postcode || '',
      abn: contact.abn || '',
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting contact: ' + error.message);
    } else {
      fetchContacts();
    }
  };

  const resetForm = () => {
    setEditingContact(null);
    setFormData({
      type: 'customer',
      company_name: '',
      contact_name: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      postcode: '',
      abn: '',
      notes: '',
    });
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesType = filterType === 'all' || contact.type === filterType;
    const matchesSearch = searchTerm === '' || 
      contact.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (contact.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (contact.phone?.includes(searchTerm));
    return matchesType && matchesSearch;
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-2">Manage your customers and suppliers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('customer')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'customer'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Customers
            </button>
            <button
              onClick={() => setFilterType('supplier')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterType === 'supplier'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Suppliers
            </button>
          </div>
        </div>
      </div>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No contacts found</h2>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterType !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first contact'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredContacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{contact.contact_name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      contact.type === 'customer' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {contact.type}
                    </span>
                  </div>
                  {contact.company_name && (
                    <p className="text-gray-600 font-medium">{contact.company_name}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(contact)}
                    className="text-primary hover:text-primary-hover font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📧</span>
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📞</span>
                    <a href={`tel:${contact.phone}`} className="text-gray-900">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">📱</span>
                    <a href={`tel:${contact.mobile}`} className="text-gray-900">
                      {contact.mobile}
                    </a>
                  </div>
                )}
                {(contact.address || contact.city || contact.state || contact.postcode) && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500">📍</span>
                    <span className="text-gray-700">
                      {contact.address && `${contact.address}, `}
                      {contact.city && `${contact.city} `}
                      {contact.state && `${contact.state} `}
                      {contact.postcode}
                    </span>
                  </div>
                )}
                {contact.abn && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">🏢</span>
                    <span className="text-gray-700">ABN: {contact.abn}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="customer"
                        checked={formData.type === 'customer'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'supplier' })}
                        className="mr-2"
                      />
                      Customer
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="supplier"
                        checked={formData.type === 'supplier'}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'customer' | 'supplier' })}
                        className="mr-2"
                      />
                      Supplier
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ABN
                    </label>
                    <input
                      type="text"
                      value={formData.abn}
                      onChange={(e) => setFormData({ ...formData, abn: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <AddressAutocomplete
                    label="Address"
                    value={formData.address}
                    onChange={(value) => setFormData({ ...formData, address: value })}
                    onAddressSelect={(components) => {
                      setFormData({
                        ...formData,
                        address: components.address,
                        city: components.city,
                        state: components.state,
                        postcode: components.postcode,
                      });
                    }}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      <option value="NSW">NSW</option>
                      <option value="VIC">VIC</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
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
                    {editingContact ? 'Update Contact' : 'Add Contact'}
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
