'use client';

import { useEffect, useRef, useState } from 'react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (addressComponents: {
    address: string;
    city: string;
    state: string;
    postcode: string;
  }) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  label?: string;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Enter address',
  className = '',
  required = false,
  label,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not found. Address autocomplete will not work.');
      return;
    }

    // Load Google Maps API using the new functional approach
    const loadPlacesLibrary = async () => {
      try {
        // Check if Google Maps is already loaded
        if (window.google?.maps?.places) {
          setIsLoaded(true);
          return;
        }

        // Check if script tag already exists
        const existingScript = document.querySelector(`script[src*="maps.googleapis.com"]`);
        if (existingScript) {
          // Wait for Google Maps to initialize
          const checkGoogle = setInterval(() => {
            if (window.google?.maps) {
              clearInterval(checkGoogle);
              google.maps.importLibrary('places').then(() => {
                setIsLoaded(true);
              }).catch((error) => {
                console.error('Error importing places library:', error);
              });
            }
          }, 100);
          
          // Timeout after 5 seconds
          setTimeout(() => clearInterval(checkGoogle), 5000);
          return;
        }

        // Load the script dynamically
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        
        script.onload = async () => {
          try {
            // Wait for Google Maps to be available
            const waitForGoogle = () => {
              return new Promise<void>((resolve) => {
                const checkInterval = setInterval(() => {
                  if (window.google?.maps) {
                    clearInterval(checkInterval);
                    resolve();
                  }
                }, 50);
                // Timeout after 5 seconds
                setTimeout(() => clearInterval(checkInterval), 5000);
              });
            };
            
            await waitForGoogle();
            await google.maps.importLibrary('places');
            setIsLoaded(true);
          } catch (error) {
            console.error('Error importing places library:', error);
          }
        };
        
        script.onerror = () => {
          console.error('Error loading Google Maps script');
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps API:', error);
      }
    };

    loadPlacesLibrary();
  }, []);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      // Initialize autocomplete with Australia restriction
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'au' }, // Restrict to Australia
        fields: ['address_components', 'formatted_address'],
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (place && place.address_components) {
          const addressComponents = {
            address: '',
            city: '',
            state: '',
            postcode: '',
          };

          let streetNumber = '';
          let route = '';

          place.address_components.forEach((component) => {
            const types = component.types;

            if (types.includes('street_number')) {
              streetNumber = component.long_name;
            }
            if (types.includes('route')) {
              route = component.long_name;
            }
            if (types.includes('locality')) {
              addressComponents.city = component.long_name;
            }
            if (types.includes('administrative_area_level_1')) {
              addressComponents.state = component.short_name;
            }
            if (types.includes('postal_code')) {
              addressComponents.postcode = component.long_name;
            }
          });

          // Combine street number and route for address
          addressComponents.address = `${streetNumber} ${route}`.trim();

          // Update the input value
          if (addressComponents.address) {
            onChange(addressComponents.address);
          }

          // Call the callback with all components
          if (onAddressSelect) {
            onAddressSelect(addressComponents);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }

    return () => {
      // Cleanup
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange, onAddressSelect]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={className || 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'}
      />
      {!isLoaded && process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p className="text-xs text-gray-500 mt-1">Loading address autocomplete...</p>
      )}
      {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
        <p className="text-xs text-gray-500 mt-1">
          Enter your address manually (Google Maps autocomplete not configured)
        </p>
      )}
      {isLoaded && (
        <p className="text-xs text-gray-500 mt-1">
          Start typing to use address autocomplete
        </p>
      )}
    </div>
  );
}
