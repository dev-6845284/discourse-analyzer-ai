import { useState, useCallback } from 'react';

export function useUIState() {
  const [isFormCollapsed, setIsFormCollapsed] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const toggleFormCollapsed = useCallback(() => {
    setIsFormCollapsed((prev) => !prev);
  }, []);

  const openAddModal = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setIsAddModalOpen(false);
  }, []);

  return {
    isFormCollapsed,
    setIsFormCollapsed,
    toggleFormCollapsed,
    isAddModalOpen,
    openAddModal,
    closeAddModal,
  };
}
