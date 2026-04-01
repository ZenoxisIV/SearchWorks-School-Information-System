"use client";

import { useState } from "react";

/**
 * Hook for managing inline table editing
 * Handles toggling edit mode, managing edit data, and save/cancel actions
 */
export function useInlineEdit<T extends Record<string, any>>(
  onSave: (id: string, data: T) => Promise<void>
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (id: string, initialData: T) => {
    setEditingId(id);
    setEditData({ ...initialData });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const saveEdit = async (id: string, onSuccess?: () => void) => {
    if (!editData) return;
    setIsSaving(true);
    try {
      await onSave(id, editData);
      setEditingId(null);
      setEditData(null);
      onSuccess?.();
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  return {
    editingId,
    editData,
    isSaving,
    startEdit,
    cancelEdit,
    saveEdit,
    updateField,
  };
}

/**
 * Hook for managing search and pagination
 * Handles search state, pagination, and filtering
 */
export function useSearchAndPagination<T extends Record<string, any>>(
  items: T[],
  searchField: keyof T,
  itemsPerPage: number = 10
) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter items based on search
  const filteredItems = items.filter((item) => {
    const value = item[searchField];
    if (typeof value === "string") {
      return value.toLowerCase().includes(search.toLowerCase());
    }
    return String(value).toLowerCase().includes(search.toLowerCase());
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when search changes
  const handleSearchChange = (newSearch: string) => {
    setSearch(newSearch);
    setCurrentPage(1);
  };

  return {
    search,
    setSearch: handleSearchChange,
    currentPage,
    setCurrentPage,
    filteredItems,
    paginatedItems,
    totalPages,
    totalFiltered: filteredItems.length,
  };
}

/**
 * Hook for managing multiple selections (checkboxes)
 * Handles toggling selections and batch operations
 */
export function useSelection<T extends string | number>(
  onSelectionChange?: (selected: T[]) => void
) {
  const [selected, setSelected] = useState<T[]>([]);

  const toggle = (id: T) => {
    const newSelected = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const toggleAll = (ids: T[], checked: boolean) => {
    const newSelected = checked ? ids : [];
    setSelected(newSelected);
    onSelectionChange?.(newSelected);
  };

  const isSelected = (id: T) => selected.includes(id);

  const clear = () => {
    setSelected([]);
    onSelectionChange?.([]);
  };

  return {
    selected,
    toggle,
    toggleAll,
    isSelected,
    clear,
    hasSelection: selected.length > 0,
    count: selected.length,
  };
}

/**
 * Hook for managing form dialogs
 * Handles open/close state and form reset
 */
export function useFormDialog() {
  const [open, setOpen] = useState(false);

  const openDialog = () => setOpen(true);
  const closeDialog = () => setOpen(false);
  const toggleDialog = () => setOpen(!open);

  return {
    open,
    setOpen,
    openDialog,
    closeDialog,
    toggleDialog,
  };
}

/**
 * Hook for managing delete confirmation dialogs
 * Handles confirmation state and deletion actions
 */
export function useDeleteConfirm(onDelete: (id: string) => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openConfirm = (id: string) => {
    setSelectedId(id);
    setOpen(true);
  };

  const closeConfirm = () => {
    setOpen(false);
    setSelectedId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    setIsDeleting(true);
    try {
      await onDelete(selectedId);
      closeConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    open,
    setOpen,
    selectedId,
    isDeleting,
    openConfirm,
    closeConfirm,
    handleDelete,
  };
}
