"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  productFormSchema,
  type ProductFormInput,
  type CreateProductInput,
} from "@/lib/validation/product";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import type { ProductVariant } from "@/types";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductInput) => Promise<void>;
  initialData?: Partial<ProductFormInput & { variants?: ProductVariant[] }>;
  categories: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}

interface VariantFormData {
  id?: string;
  name: string;
  price: number;
  stockQuantity: number;
  attributes: Record<string, string>;
  keywords: string[];
}

export function ProductForm({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  isLoading = false,
}: ProductFormProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const [metadataFields, setMetadataFields] = useState<
    Array<{ key: string; value: string }>
  >([]);

  // Variant management state
  const [variants, setVariants] = useState<VariantFormData[]>([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<VariantFormData | null>(
    null
  );
  const [variantFormData, setVariantFormData] = useState<VariantFormData>({
    name: "",
    price: 0,
    stockQuantity: 0,
    attributes: {},
    keywords: [],
  });
  const [variantKeywordInput, setVariantKeywordInput] = useState("");
  const [variantAttributeFields, setVariantAttributeFields] = useState<
    Array<{ key: string; value: string }>
  >([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: 0,
      categoryId: "",
      keywords: [],
      metadata: {
        author: "",
        publisher: "",
        language: "",
        isbn: "",
        material: "",
        dimensions: "",
        weight: "",
        color: "",
        customAttributes: {},
      },
      isActive: true,
      ...initialData,
    },
  });

  const keywords = watch("keywords");

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name ?? "",
        description: initialData.description ?? "",
        basePrice: initialData.basePrice ?? 0,
        categoryId: initialData.categoryId ?? "",
        keywords:
          initialData.keywords?.map((k) =>
            typeof k === "string" ? { value: k } : k
          ) ?? [],
        metadata: {
          author: initialData.metadata?.author ?? "",
          publisher: initialData.metadata?.publisher ?? "",
          language: initialData.metadata?.language ?? "",
          isbn: initialData.metadata?.isbn ?? "",
          material: initialData.metadata?.material ?? "",
          dimensions: initialData.metadata?.dimensions ?? "",
          weight: initialData.metadata?.weight ?? "",
          color: initialData.metadata?.color ?? "",
          customAttributes: initialData.metadata?.customAttributes ?? {},
        },
        isActive: initialData.isActive ?? true,
      });

      // Set metadata fields for editing
      if (initialData.metadata?.customAttributes) {
        const fields = Object.entries(
          initialData.metadata.customAttributes
        ).map(([key, value]) => ({
          key,
          value: String(value),
        }));
        setMetadataFields(fields);
      }

      // Set variants for editing
      if (initialData.variants) {
        const variantData = initialData.variants.map((variant) => ({
          id: variant.id,
          name: variant.name,
          price: variant.price,
          stockQuantity: variant.stockQuantity,
          attributes: variant.attributes || {},
          keywords: variant.keywords || [],
        }));
        setVariants(variantData);
      }
    }
  }, [initialData, reset]);

  const handleAddKeyword = () => {
    if (
      keywordInput.trim() &&
      !keywords?.some((k) => k.value === keywordInput.trim())
    ) {
      setValue("keywords", [
        ...(keywords || []),
        { value: keywordInput.trim() },
      ]);
      setKeywordInput("");
    }
  };

  const handleKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleAddMetadataField = () => {
    setMetadataFields([...metadataFields, { key: "", value: "" }]);
  };

  const handleRemoveMetadataField = (index: number) => {
    const newFields = metadataFields.filter((_, i) => i !== index);
    setMetadataFields(newFields);
    updateCustomAttributes(newFields);
  };

  const handleMetadataFieldChange = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newFields = [...metadataFields];
    newFields[index][field] = value;
    setMetadataFields(newFields);
    updateCustomAttributes(newFields);
  };

  const updateCustomAttributes = (
    fields: Array<{ key: string; value: string }>
  ) => {
    const customAttributes = fields.reduce((acc, field) => {
      if (field.key.trim() && field.value.trim()) {
        acc[field.key.trim()] = field.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    setValue("metadata.customAttributes", customAttributes);
  };

  // Variant management handlers
  const handleAddVariant = () => {
    setEditingVariant(null);
    setVariantFormData({
      name: "",
      price: 0,
      stockQuantity: 0,
      attributes: {},
      keywords: [],
    });
    setVariantKeywordInput("");
    setVariantAttributeFields([]);
    setShowVariantForm(true);
  };

  const handleEditVariant = (variant: VariantFormData) => {
    setEditingVariant(variant);
    setVariantFormData({ ...variant });
    setVariantKeywordInput("");

    // Set variant attribute fields for editing
    const fields = Object.entries(variant.attributes).map(([key, value]) => ({
      key,
      value: String(value),
    }));
    setVariantAttributeFields(fields);
    setShowVariantForm(true);
  };

  const handleDeleteVariant = (index: number) => {
    const newVariants = variants.filter((_, i) => i !== index);
    setVariants(newVariants);
  };

  const handleSaveVariant = () => {
    if (!variantFormData.name.trim()) {
      alert("Variant name is required");
      return;
    }

    const variantToSave = {
      ...variantFormData,
      attributes: variantAttributeFields.reduce((acc, field) => {
        if (field.key.trim() && field.value.trim()) {
          acc[field.key.trim()] = field.value.trim();
        }
        return acc;
      }, {} as Record<string, string>),
    };

    if (editingVariant) {
      // Update existing variant
      const index = variants.findIndex(
        (v) =>
          v.id === editingVariant.id ||
          (v.name === editingVariant.name && v.price === editingVariant.price)
      );
      if (index !== -1) {
        const newVariants = [...variants];
        newVariants[index] = variantToSave;
        setVariants(newVariants);
      }
    } else {
      // Add new variant
      setVariants([
        ...variants,
        { ...variantToSave, id: `temp-${Date.now()}` },
      ]);
    }

    setShowVariantForm(false);
    setEditingVariant(null);
  };

  const handleAddVariantKeyword = () => {
    if (
      variantKeywordInput.trim() &&
      !variantFormData.keywords.includes(variantKeywordInput.trim())
    ) {
      setVariantFormData({
        ...variantFormData,
        keywords: [...variantFormData.keywords, variantKeywordInput.trim()],
      });
      setVariantKeywordInput("");
    }
  };

  const handleRemoveVariantKeyword = (index: number) => {
    const newKeywords = variantFormData.keywords.filter((_, i) => i !== index);
    setVariantFormData({
      ...variantFormData,
      keywords: newKeywords,
    });
  };

  const handleVariantKeywordKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddVariantKeyword();
    }
  };

  const handleAddVariantAttributeField = () => {
    setVariantAttributeFields([
      ...variantAttributeFields,
      { key: "", value: "" },
    ]);
  };

  const handleRemoveVariantAttributeField = (index: number) => {
    const newFields = variantAttributeFields.filter((_, i) => i !== index);
    setVariantAttributeFields(newFields);
  };

  const handleVariantAttributeFieldChange = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const newFields = [...variantAttributeFields];
    newFields[index][field] = value;
    setVariantAttributeFields(newFields);
  };

  const handleFormSubmit = async (data: ProductFormInput) => {
    try {
      // Transform keywords back to string array
      const transformedData = {
        ...data,
        keywords: data.keywords.map((k) => k.value),
        variants: variants.map((variant) => ({
          ...variant,
          id: variant.id?.startsWith("temp-") ? undefined : variant.id, // Remove temp IDs
        })),
      };
      await onSubmit(transformedData as any);
      reset();
      setKeywordInput("");
      setMetadataFields([]);
      setVariants([]);
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Name *
            </label>
            <Input
              {...register("name")}
              placeholder="Enter product name"
              error={errors.name?.message}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Enter product description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price *
              </label>
              <Input
                {...register("basePrice", { valueAsNumber: true })}
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
                {...register("categoryId")}
                options={[
                  { value: "", label: "Select category" },
                  ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  })),
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
                      onClick={() =>
                        setValue(
                          "keywords",
                          keywords.filter((_, i) => i !== index)
                        )
                      }
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
          <h3 className="text-lg font-medium text-gray-900">
            Product Metadata
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author
              </label>
              <Input
                {...register("metadata.author")}
                placeholder="Author name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Publisher
              </label>
              <Input
                {...register("metadata.publisher")}
                placeholder="Publisher name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <Input
                {...register("metadata.language")}
                placeholder="Language"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISBN
              </label>
              <Input {...register("metadata.isbn")} placeholder="ISBN number" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <Input
                {...register("metadata.material")}
                placeholder="Material type"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <Input {...register("metadata.color")} placeholder="Color" />
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
                  onChange={(e) =>
                    handleMetadataFieldChange(index, "key", e.target.value)
                  }
                  placeholder="Field name"
                  className="flex-1"
                />
                <Input
                  value={field.value}
                  onChange={(e) =>
                    handleMetadataFieldChange(index, "value", e.target.value)
                  }
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

        {/* Product Variants */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Product Variants
            </h3>
            <Button
              type="button"
              onClick={handleAddVariant}
              variant="outline"
              size="sm"
              className="text-orange-600 border-orange-600 hover:bg-orange-50"
            >
              Add Variant
            </Button>
          </div>

          {variants.length > 0 && (
            <div className="space-y-3">
              {variants.map((variant, index) => (
                <div
                  key={variant.id || index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="font-medium text-gray-900">
                          {variant.name}
                        </h4>
                        <span className="text-sm text-gray-600">
                          ₹{variant.price}
                        </span>
                        <span className="text-sm text-gray-600">
                          Stock: {variant.stockQuantity}
                        </span>
                      </div>

                      {Object.keys(variant.attributes).length > 0 && (
                        <div className="mb-2">
                          <span className="text-sm text-gray-600">
                            Attributes:{" "}
                          </span>
                          {Object.entries(variant.attributes).map(
                            ([key, value]) => (
                              <span
                                key={key}
                                className="text-sm text-gray-800 mr-2"
                              >
                                {key}: {value}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {variant.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {variant.keywords.map((keyword, keywordIndex) => (
                            <span
                              key={keywordIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handleEditVariant(variant)}
                        variant="outline"
                        size="sm"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleDeleteVariant(index)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {variants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>
                No variants added yet. Click &quot;Add Variant&quot; to create
                product variations.
              </p>
            </div>
          )}
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
            {isSubmitting || isLoading ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </form>

      {/* Variant Form Modal */}
      {showVariantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingVariant ? "Edit Variant" : "Add Variant"}
              </h3>
              <button
                onClick={() => setShowVariantForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {/* Variant Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variant Name *
                  </label>
                  <Input
                    value={variantFormData.name}
                    onChange={(e) =>
                      setVariantFormData({
                        ...variantFormData,
                        name: e.target.value,
                      })
                    }
                    placeholder="e.g., Small, Large, Red, Blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={variantFormData.price}
                    onChange={(e) =>
                      setVariantFormData({
                        ...variantFormData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Quantity
                </label>
                <Input
                  type="number"
                  min="0"
                  value={variantFormData.stockQuantity}
                  onChange={(e) =>
                    setVariantFormData({
                      ...variantFormData,
                      stockQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              {/* Variant Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variant Keywords
                </label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={variantKeywordInput}
                    onChange={(e) => setVariantKeywordInput(e.target.value)}
                    onKeyDown={handleVariantKeywordKeyPress}
                    placeholder="Enter keyword and press Enter"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddVariantKeyword}
                    variant="outline"
                    disabled={!variantKeywordInput.trim()}
                  >
                    Add
                  </Button>
                </div>

                {variantFormData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {variantFormData.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {keyword}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantKeyword(index)}
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
                    onClick={handleAddVariantAttributeField}
                    variant="outline"
                    size="sm"
                  >
                    Add Attribute
                  </Button>
                </div>

                {variantAttributeFields.map((field, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <Input
                      value={field.key}
                      onChange={(e) =>
                        handleVariantAttributeFieldChange(
                          index,
                          "key",
                          e.target.value
                        )
                      }
                      placeholder="Attribute name (e.g., Size, Color)"
                      className="flex-1"
                    />
                    <Input
                      value={field.value}
                      onChange={(e) =>
                        handleVariantAttributeFieldChange(
                          index,
                          "value",
                          e.target.value
                        )
                      }
                      placeholder="Attribute value (e.g., Large, Red)"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => handleRemoveVariantAttributeField(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-800"
                    >
                      Remove
                    </Button>
                  </div>
                ))}

                {variantAttributeFields.length === 0 && (
                  <p className="text-sm text-gray-500">
                    No attributes added. Click &quot;Add Attribute&quot; to
                    specify variant characteristics like size, color, etc.
                  </p>
                )}
              </div>
            </div>

            {/* Variant Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowVariantForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveVariant}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {editingVariant ? "Update Variant" : "Add Variant"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
