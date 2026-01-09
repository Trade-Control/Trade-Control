'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DocumentUploadProps {
  jobId: string;
  onSuccess: () => void;
}

export default function DocumentUpload({ jobId, onSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Create unique file path: organizationId/jobId/timestamp-filename
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}-${file.name}`;
      const filePath = `${profile.organization_id}/${jobId}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase
        .storage
        .from('job-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      // Create database record
      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          job_id: jobId,
          organization_id: profile.organization_id,
          created_by: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          description: description || null,
        }]);

      if (dbError) throw dbError;

      setUploadProgress(100);

      // Reset form
      setFile(null);
      setDescription('');
      if (e.target instanceof HTMLFormElement) {
        e.target.reset();
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Upload error:', error);
      setError(error.message || 'Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Upload Document</h2>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
          {file && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
            placeholder="Brief description of the document"
          />
        </div>

        {uploading && (
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="flex justify-between text-sm text-blue-800 mb-2">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading || !file}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : '📤 Upload Document'}
        </button>
      </form>
    </div>
  );
}
