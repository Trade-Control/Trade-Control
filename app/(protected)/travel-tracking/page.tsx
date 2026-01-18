'use client';

import { useEffect, useState } from 'react';
import { useSafeSupabaseClient } from '@/lib/supabase/safe-client';
import { TravelLog } from '@/lib/types/database.types';
import AddressAutocomplete from '@/components/AddressAutocomplete';

export default function TravelTrackingPage() {
  const [travelLogs, setTravelLogs] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [formData, setFormData] = useState({
    origin_address: '',
    destination_address: '',
    job_id: '',
    distance_km: '',
    duration_minutes: '',
    is_manual: false,
    notes: '',
  });

  const supabase = useSafeSupabaseClient();

  useEffect(() => {
    if (supabase) {
      fetchTravelLogs();
      fetchJobs();
    }
  }, [supabase]);

  const fetchTravelLogs = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('travel_logs')
      .select(`
        *,
        jobs (
          id,
          job_number,
          title
        )
      `)
      .order('travel_date', { ascending: false });

    if (error) {
      console.error('Error fetching travel logs:', error);
    } else {
      setTravelLogs(data || []);
    }
    setLoading(false);
  };

  const fetchJobs = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('jobs')
      .select('id, job_number, title, status')
      .in('status', ['draft', 'quoted', 'approved', 'in_progress'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
    } else {
      setJobs(data || []);
    }
  };

  const calculateRoute = async () => {
    if (!formData.origin_address || !formData.destination_address) {
      alert('Please enter both origin and destination addresses');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      alert('Google Maps API key not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file');
      return;
    }

    setCalculating(true);

    try {
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
      
      if (!existingScript) {
        // Load Google Maps script if not already loaded
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=routes&loading=async`;
        script.async = true;
        script.defer = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            // Wait for Google Maps to initialize
            const waitForGoogle = () => {
              return new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                  if (window.google?.maps) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 50);
                setTimeout(() => clearInterval(checkInterval), 5000);
              });
            };
            waitForGoogle().then(resolve);
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } else if (!window.google?.maps) {
        // Script exists but Google Maps not initialized yet
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          setTimeout(() => clearInterval(checkInterval), 5000);
        });
      }

      // Import the routes library
      const { DirectionsService } = await google.maps.importLibrary('routes') as google.maps.RoutesLibrary;
      const service = new DirectionsService();

      const request = {
        origin: formData.origin_address,
        destination: formData.destination_address,
        travelMode: google.maps.TravelMode.DRIVING,
        region: 'AU',
      };

      service.route(request, (result, status) => {
        if (status === 'OK' && result) {
          const route = result.routes[0];
          const leg = route.legs[0];

          const distanceKm = (leg.distance?.value || 0) / 1000;
          const durationMinutes = Math.ceil((leg.duration?.value || 0) / 60);

          setFormData({
            ...formData,
            distance_km: distanceKm.toFixed(2),
            duration_minutes: durationMinutes.toString(),
            is_manual: false,
          });

          alert(`Route calculated: ${distanceKm.toFixed(2)} km, ${durationMinutes} minutes`);
        } else {
          alert('Could not calculate route. Please check addresses and try again.');
        }
        setCalculating(false);
      });
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Error calculating route. Please try again.');
      setCalculating(false);
    }
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

    const travelData = {
      organization_id: profile.organization_id,
      created_by: user.id,
      job_id: formData.job_id || null,
      origin_address: formData.origin_address,
      destination_address: formData.destination_address,
      distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
      duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
      is_manual: formData.is_manual,
      notes: formData.notes || null,
    };

    const { error } = await supabase
      .from('travel_logs')
      .insert(travelData);

    if (error) {
      alert('Error saving travel log: ' + error.message);
    } else {
      setShowModal(false);
      resetForm();
      fetchTravelLogs();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this travel log?')) return;

    const { error } = await supabase
      .from('travel_logs')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting travel log: ' + error.message);
    } else {
      fetchTravelLogs();
    }
  };

  const resetForm = () => {
    setFormData({
      origin_address: '',
      destination_address: '',
      job_id: '',
      distance_km: '',
      duration_minutes: '',
      is_manual: false,
      notes: '',
    });
  };

  const totalDistance = travelLogs.reduce((sum, log) => sum + (log.distance_km || 0), 0);
  const totalDuration = travelLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

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
          <h1 className="text-3xl font-bold text-gray-900">Travel Tracking</h1>
          <p className="text-gray-600 mt-2">Track travel distance and time for jobs</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          + Log Travel
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Trips</div>
          <div className="text-3xl font-bold text-gray-900">{travelLogs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Distance</div>
          <div className="text-3xl font-bold text-blue-600">{totalDistance.toFixed(2)} km</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Time</div>
          <div className="text-3xl font-bold text-green-600">
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}m
          </div>
        </div>
      </div>

      {/* Travel Logs Table */}
      {travelLogs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="flex justify-center mb-4">
            <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No travel logs found</h2>
          <p className="text-gray-600 mb-6">
            Start tracking your travel to jobs and other locations
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    From / To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {travelLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(log.travel_date).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.travel_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="text-gray-900 font-medium">From: {log.origin_address}</div>
                        <div className="text-gray-900 font-medium">To: {log.destination_address}</div>
                        {log.notes && (
                          <div className="text-gray-500 mt-1">{log.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.jobs ? (
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">{log.jobs.title}</div>
                          <div className="text-gray-500">#{log.jobs.job_number}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.distance_km ? `${log.distance_km.toFixed(2)} km` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {log.duration_minutes ? `${log.duration_minutes} min` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        log.is_manual 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.is_manual ? 'Manual' : 'Calculated'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDelete(log.id)}
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
                Log Travel
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AddressAutocomplete
                      label="From (Origin)"
                      value={formData.origin_address}
                      onChange={(value) => setFormData({ ...formData, origin_address: value })}
                      placeholder="Enter starting address"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if ('geolocation' in navigator) {
                          navigator.geolocation.getCurrentPosition(
                            async (position) => {
                              const { latitude, longitude } = position.coords;
                              
                              // Reverse geocode to get address
                              try {
                                const response = await fetch(
                                  `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                                );
                                const data = await response.json();
                                
                                if (data.results && data.results[0]) {
                                  setFormData({ 
                                    ...formData, 
                                    origin_address: data.results[0].formatted_address 
                                  });
                                } else {
                                  alert('Could not determine address from location');
                                }
                              } catch (error) {
                                console.error('Geocoding error:', error);
                                alert('Failed to get address from location');
                              }
                            },
                            (error) => {
                              console.error('Geolocation error:', error);
                              alert('Failed to get current location. Please ensure location permissions are enabled.');
                            }
                          );
                        } else {
                          alert('Geolocation is not supported by your browser');
                        }
                      }}
                      className="mt-7 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap"
                    >
                      📍 Use Current Location
                    </button>
                  </div>
                </div>

                <AddressAutocomplete
                  label="To (Destination)"
                  value={formData.destination_address}
                  onChange={(value) => setFormData({ ...formData, destination_address: value })}
                  placeholder="Enter destination address"
                  required
                />

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={calculateRoute}
                    disabled={calculating || !formData.origin_address || !formData.destination_address}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300"
                  >
                    {calculating ? 'Calculating...' : '🗺️ Calculate Route'}
                  </button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={formData.is_manual}
                      onChange={(e) => setFormData({ ...formData, is_manual: e.target.checked })}
                      className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Manual Entry (enter distance and time manually)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Distance (km) {!formData.is_manual && '*'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.distance_km}
                        onChange={(e) => setFormData({ ...formData, distance_km: e.target.value })}
                        required={!formData.is_manual}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (minutes) {!formData.is_manual && '*'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                        required={!formData.is_manual}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associate with Job (Optional)
                  </label>
                  <select
                    value={formData.job_id}
                    onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">No job</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        #{job.job_number} - {job.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Optional notes about this trip"
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
                    Save Travel Log
                  </button>
                  <button
                    type="button"
                    onClick={async (e) => {
                      // Trigger form submit first
                      const form = e.currentTarget.closest('form');
                      if (form) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        const formValid = form.reportValidity();
                        
                        if (formValid) {
                          // Submit the form
                          form.dispatchEvent(submitEvent);
                          
                          // Wait a bit for submission to complete
                          setTimeout(() => {
                            // Open Google Maps with directions
                            const origin = encodeURIComponent(formData.origin_address);
                            const destination = encodeURIComponent(formData.destination_address);
                            const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
                            window.open(mapsUrl, '_blank');
                          }, 500);
                        }
                      }
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    🗺️ Save & Open Maps
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
