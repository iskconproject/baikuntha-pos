'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Package } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormInput, type CreateProductInput } from '@/lib/validation/product';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import type { ProductVariant } from '@/types';
import type { CategoryHierarchy } from '@/services/database/categories';

interface VariantFormData {
  id?: string;
  name: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, string>;
  keywords: string[];
}

// Utility function to flatten category hierarchy
const flattenCategories = (categories: CategoryHierarchy[]): Array<{ id: string; name: string }> => {
  const result: Array<{ id: string; name: string }> = [];
  
  const flatten = (cats: CategoryHierarchy[], level: number = 0) => {
    cats.forEach(cat => {
      result.push({
        id: cat.id,
        name: '  '.repeat(level) + cat.name
      });
      if (cat.children && cat.children.length > 0) {
        flatten(cat.children, level + 1);
      }
    });
  };
  
  flatten(categories);
  return result;
};

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryHierarchy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [metadataFields, setMetadataFields] = useState<Array<{ key: string; value: string }>>([]);
  
  // Variant management state
  const [variants, setVariants] = useState<VariantFormData[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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
    },
  });

  const keywords = watch('keywords');

  // Check permissions
  const canManageInventory = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories?hierarchy=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

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

  const handleAddVariant = () => {
    const newVariant: VariantFormData = {
      id: `temp-${Date.now()}`,
      name: '',
      price: 0,
      stockQuantity: 0,
      attributes: {},
      keywords: [],
    };
    setVariants([...variants, newVariant]);
    setActiveVariantIndex(variants.length);
  };

  const handleDeleteVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
    if (activeVariantIndex === index) {
      setActiveVariantIndex(null);
    } else if (activeVariantIndex !== null && activeVariantIndex > index) {
      setActiveVariantIndex(activeVariantIndex - 1);
    }
  };

  const handleFormSubmit = async (data: ProductFormInput) => {
    try {
      setIsLoading(true);
      
      // Transform keywords back to string array
      const transformedData = {
        ...data,
        keywords: data.keywords.map(k => k.value),
        variants: variants.map(variant => ({
          ...variant,
          id: variant.id?.startsWith('temp-') ? undefined : variant.id, // Remove temp IDs
        })),
      };

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product');
      }

      router.push('/inventory');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Temporarily disable auth check for debugging
  // if (!canManageInventory) {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
              <p className="text-gray-600 mt-2">Create a new product with variants and detailed information</p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/inventory')}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
          {/* Basic Information Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <Input
                  {...register('name')}
                  placeholder="Enter product name"
                  error={errors.name?.message}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter product description"
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <Select
                  {...register('categoryId')}
                  options={[
                    { value: '', label: 'Select category' },
                    ...flattenCategories(categories).map(cat => ({ value: cat.id, label: cat.name })),
                  ]}
                  error={errors.categoryId?.message}
                />
              </div>
            </div>
          </div>

          {/* Keywords Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Search Keywords</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Metadata</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <Input
                  {...register('metadata.author')}
                  placeholder="Author name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publisher
                </label>
                <Input
                  {...register('metadata.publisher')}
                  placeholder="Publisher name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <Input
                  {...register('metadata.language')}
                  placeholder="Language"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ISBN
                </label>
                <Input
                  {...register('metadata.isbn')}
                  placeholder="ISBN number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Material
                </label>
                <Input
                  {...register('metadata.material')}
                  placeholder="Material type"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <Input
                  {...register('metadata.color')}
                  placeholder="Color"
                />
              </div>
            </div>

            {/* Custom Attributes */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
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

          {/* Product Variants Card */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Product Variants</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Create different variations of this product (size, color, etc.)
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddVariant}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Add Variant
                </Button>
              </div>
            </div>

            <div className="p-6">
              {variants.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">No variants added yet</p>
                  <p className="text-sm">Click "Add Variant" to create product variations like different sizes, colors, or editions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Variants List */}
                  <div className="space-y-3">
                    <h3 className="font-medium text-gray-900">Variants ({variants.length})</h3>
                    {variants.map((variant, index) => (
                      <div
                        key={variant.id || index}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          activeVariantIndex === index
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setActiveVariantIndex(index)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {variant.name || `Variant ${index + 1}`}
                            </h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>₹{variant.price}</span>
                              <span>Stock: {variant.stockQuantity}</span>
                            </div>
                            {Object.keys(variant.attributes).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {Object.entries(variant.attributes).map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                                  >
                                    {key}: {value}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVariant(index);
                            }}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Variant Editor */}
                  {activeVariantIndex !== null && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-medium text-gray-900 mb-4">
                        Edit Variant {activeVariantIndex + 1}
                      </h3>
                      <VariantEditor
                        variant={variants[activeVariantIndex]}
                        onChange={(updatedVariant) => {
                          const newVariants = [...variants];
                          newVariants[activeVariantIndex] = updatedVariant;
                          setVariants(newVariants);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/inventory')}
              disabled={isSubmitting || isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting || isLoading ? 'Creating Product...' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Variant Editor Component
interface VariantEditorProps {
  variant: VariantFormData;
  onChange: (variant: VariantFormData) => void;
}

function VariantEditor({ variant, onChange }: VariantEditorProps) {
  const [keywordInput, setKeywordInput] = useState('');
  const [attributeFields, setAttributeFields] = useState<Array<{ key: string; value: string }>>(
    Object.entries(variant.attributes).map(([key, value]) => ({ key, value }))
  );

  const handleVariantChange = (field: keyof VariantFormData, value: any) => {
    onChange({ ...variant, [field]: value });
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !variant.keywords.includes(keywordInput.trim())) {
      handleVariantChange('keywords', [...variant.keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    const newKeywords = variant.keywords.filter((_, i) => i !== index);
    handleVariantChange('keywords', newKeywords);
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleAddAttributeField = () => {
    setAttributeFields([...attributeFields, { key: '', value: '' }]);
  };

  const handleRemoveAttributeField = (index: number) => {
    const newFields = attributeFields.filter((_, i) => i !== index);
    setAttributeFields(newFields);
    updateAttributes(newFields);
  };

  const handleAttributeFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...attributeFields];
    newFields[index][field] = value;
    setAttributeFields(newFields);
    updateAttributes(newFields);
  };

  const updateAttributes = (fields: Array<{ key: string; value: string }>) => {
    const attributes = fields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    handleVariantChange('attributes', attributes);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Variant Name *
        </label>
        <Input
          value={variant.name}
          onChange={(e) => handleVariantChange('name', e.target.value)}
          placeholder="e.g., Small, Large, Red, Blue"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price *
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={variant.price}
            onChange={(e) => handleVariantChange('price', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stock Quantity
          </label>
          <Input
            type="number"
            min="0"
            value={variant.stockQuantity}
            onChange={(e) => handleVariantChange('stockQuantity', parseInt(e.target.value) || 0)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Variant Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Variant Keywords
        </label>
        <div className="flex gap-2 mb-2">
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
            size="sm"
            disabled={!keywordInput.trim()}
          >
            Add
          </Button>
        </div>

        {variant.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {variant.keywords.map((keyword, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(index)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Variant Attributes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Variant Attributes
          </label>
          <Button
            type="button"
            onClick={handleAddAttributeField}
            variant="outline"
            size="sm"
          >
            Add Attribute
          </Button>
        </div>

        {attributeFields.map((field, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <Input
              value={field.key}
              onChange={(e) => handleAttributeFieldChange(index, 'key', e.target.value)}
              placeholder="Attribute name (e.g., Size, Color)"
              className="flex-1"
            />
            <Input
              value={field.value}
              onChange={(e) => handleAttributeFieldChange(index, 'value', e.target.value)}
              placeholder="Attribute value (e.g., Large, Red)"
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => handleRemoveAttributeField(index)}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </Button>
          </div>
        ))}

        {attributeFields.length === 0 && (
          <p className="text-sm text-gray-500">
            No attributes added. Click "Add Attribute" to specify variant characteristics like size, color, etc.
          </p>
        )}
      </div>
    </div>
  );
}