'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormInput, type CreateProductInput } from '@/lib/validation/product';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductInput) => Promise<void>;
  initialData?: Partial<ProductFormInput>;
  categories: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

export function ProductForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  isLoading = false,
}: ProductFormProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>([]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      basePrice: 0,
      categoryId: '',
      keywords: [],
      metadata: {
        author: '',
        publisher: '',
        language: '',
        isbn: '',
        material: '',
        dimensions: '',
        weight: '',
        color: '',
        customAttributes: {},
      },
      isActive: true,
      ...initialData,
    },
  });

  const keywords = watch('keywords');

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? '',
        description: initialData.description ?? '',
        basePrice: initialData.basePrice ?? 0,
        categoryId: initialData.categoryId ?? '',
        keywords: initialData.keywords?.map(k => typeof k === 'string' ? { value: k } : k) ?? [],
        metadata: {
          author: initialData.metadata?.author ?? '',
          publisher: initialData.metadata?.publisher ?? '',
          language: initialData.metadata?.language ?? '',
          isbn: initialData.metadata?.isbn ?? '',
          material: initialData.metadata?.material ?? '',
          dimensions: initialData.metadata?.dimensions ?? '',
          weight: initialData.metadata?.weight ?? '',
          color: initialData.metadata?.color ?? '',
          customAttributes: initialData.metadata?.customAttributes ?? {},
        },
        isActive: initialData.isActive ?? true,
      });

      // Set metadata fields for editing
      if (initialData.metadata?.customAttributes) {
        const fields = Object.entries(initialData.metadata.customAttributes).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        setMetadataFields(fields);
      }
    }
  }, [initialData, reset]);

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords?.some(k => k.value === keywordInput.trim())) {
      setValue('keywords', [...(keywords || []), { value: keywordInput.trim() }]);
      setKeywordInput('');
    }
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleAddMetadataField = () => {
    setMetadataFields([...metadataFields, { key: '', value: '' }]);
  };

  const handleRemoveMetadataField = (index: number) => {
    const newFields = metadataFields.filter((_, i) => i !== index);
    setMetadataFields(newFields);
    updateCustomAttributes(newFields);
  };

  const handleMetadataFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...metadataFields];
    newFields[index][field] = value;
    setMetadataFields(newFields);
    updateCustomAttributes(newFields);
  };

  const updateCustomAttributes = (fields: Array<{ key: string; value: string }>) => {
    const customAttributes = fields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    setValue('metadata.customAttributes', customAttributes);
  };

  const handleFormSubmit = async (data: ProductFormInput) => {
    try {
      // Transform keywords back to string array
      const transformedData = {
        ...data,
        keywords: data.keywords.map(k => k.value),
      };
      await onSubmit(transformedData as any);
      reset();
      setKeywordInput('');
      setMetadataFields([]);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <Input
              {...register('name')}
              placeholder="Enter product name"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter product description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price *
              </label>
              <Input
                {...register('basePrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                error={errors.basePrice?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <Select
                {...register('categoryId')}
                options={[
                  { value: '', label: 'Select category' },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name })),
                ]}
                error={errors.categoryId?.message}
              />
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Search Keywords</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add Keywords
            </label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyPress}
                placeholder="Enter keyword and press Enter"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddKeyword}
                variant="outline"
                disabled={!keywordInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {keywords?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords
              </label>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                  >
                    {keyword.value}
                    <button
                      type="button"
                      onClick={() => setValue('keywords', keywords.filter((_, i) => i !== index))}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Product Metadata</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <Input
                {...register('metadata.author')}
                placeholder="Author name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher
              </label>
              <Input
                {...register('metadata.publisher')}
                placeholder="Publisher name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <Input
                {...register('metadata.language')}
                placeholder="Language"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISBN
              </label>
              <Input
                {...register('metadata.isbn')}
                placeholder="ISBN number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <Input
                {...register('metadata.material')}
                placeholder="Material type"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <Input
                {...register('metadata.color')}
                placeholder="Color"
              />
            </div>
          </div>

          {/* Custom Attributes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Custom Attributes
              </label>
              <Button
                type="button"
                onClick={handleAddMetadataField}
                variant="outline"
                size="sm"
              >
                Add Field
              </Button>
            </div>

            {metadataFields.map((field, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={field.key}
                  onChange={(e) => handleMetadataFieldChange(index, 'key', e.target.value)}
                  placeholder="Field name"
                  className="flex-1"
                />
                <Input
                  value={field.value}
                  onChange={(e) => handleMetadataFieldChange(index, 'value', e.target.value)}
                  placeholder="Field value"
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={() => handleRemoveMetadataField(index)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting || isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isSubmitting || isLoading ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
