'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { updateUserSchema, type UpdateUserInput } from '@/lib/validation/user';
import type { UserRole } from '@/types/auth';

interface User {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
}

interface EditUserFormProps {
  user: User;
  onSubmit: (data: UpdateUserInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const roleOptions = [
  { value: 'cashier', label: 'Cashier' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Administrator' },
];

export const EditUserForm: React.FC<EditUserFormProps> = ({
  user,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UpdateUserInput>({
    username: user.username,
    role: user.role,
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof UpdateUserInput, string>>>({});

  const handleChange = (field: keyof UpdateUserInput, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Only include changed fields
      const changedData: UpdateUserInput = {};
      
      if (formData.username !== user.username) {
        changedData.username = formData.username;
      }
      
      if (formData.role !== user.role) {
        changedData.role = formData.role;
      }
      
      // If no changes, just close the form
      if (Object.keys(changedData).length === 0) {
        onCancel();
        return;
      }
      
      // Validate form data
      const validatedData = updateUserSchema.parse(changedData);
      
      // Clear any existing errors
      setErrors({});
      
      // Submit form
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        // Handle validation errors
        const zodError = error as any;
        const fieldErrors: Partial<Record<keyof UpdateUserInput, string>> = {};
        
        zodError.errors.forEach((err: any) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as keyof UpdateUserInput] = err.message;
          }
        });
        
        setErrors(fieldErrors);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Username"
        value={formData.username || ''}
        onChange={(e) => handleChange('username', e.target.value)}
        error={errors.username}
        placeholder="Enter username"
        required
        disabled={loading}
        hint="3-20 characters, letters, numbers, and underscores only"
      />
      
      <Select
        label="Role"
        value={formData.role || user.role}
        onChange={(e) => handleChange('role', e.target.value as UserRole)}
        error={errors.role}
        options={roleOptions}
        required
        disabled={loading}
        hint="Select the user's access level"
      />
      
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={loading}
        >
          Update User
        </Button>
      </div>
    </form>
  );
};