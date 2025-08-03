'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createUserSchema, type CreateUserInput } from '@/lib/validation/user';
import type { UserRole } from '@/types/auth';

interface CreateUserFormProps {
  onSubmit: (data: CreateUserInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const roleOptions = [
  { value: 'cashier', label: 'Cashier' },
  { value: 'manager', label: 'Manager' },
  { value: 'admin', label: 'Administrator' },
];

export const CreateUserForm: React.FC<CreateUserFormProps> = ({
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    pin: '',
    confirmPin: '',
    role: 'cashier',
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof CreateUserInput, string>>>({});

  const handleChange = (field: keyof CreateUserInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = createUserSchema.parse(formData);
      
      // Clear any existing errors
      setErrors({});
      
      // Submit form
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        // Handle validation errors
        const zodError = error as any;
        const fieldErrors: Partial<Record<keyof CreateUserInput, string>> = {};
        
        zodError.errors.forEach((err: any) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as keyof CreateUserInput] = err.message;
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
        value={formData.username}
        onChange={(e) => handleChange('username', e.target.value)}
        error={errors.username}
        placeholder="Enter username"
        required
        disabled={loading}
        hint="3-20 characters, letters, numbers, and underscores only"
      />
      
      <Select
        label="Role"
        value={formData.role}
        onChange={(e) => handleChange('role', e.target.value as UserRole)}
        error={errors.role}
        options={roleOptions}
        required
        disabled={loading}
        hint="Select the user's access level"
      />
      
      <Input
        label="PIN"
        type="password"
        value={formData.pin}
        onChange={(e) => handleChange('pin', e.target.value)}
        error={errors.pin}
        placeholder="Enter 4-8 digit PIN"
        required
        disabled={loading}
        hint="4-8 digits, no sequential or repeated numbers"
      />
      
      <Input
        label="Confirm PIN"
        type="password"
        value={formData.confirmPin}
        onChange={(e) => handleChange('confirmPin', e.target.value)}
        error={errors.confirmPin}
        placeholder="Confirm PIN"
        required
        disabled={loading}
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
          Create User
        </Button>
      </div>
    </form>
  );
};