import { useEffect, useCallback } from 'react';
import { useTabStore } from '../store/tab-store';
import { useCollectionStore } from '../store/collection-store';
export function useKeyboardShortcuts(onSaveRequested?: () => void) {
    const { addTab, tabs, activeTabId } = useTabStore();
    const { collections, updateItem, fetchCollections } = useCollectionStore();

    const handleKeyDown = useCallback(
        async (e: KeyboardEvent) => {
            const isMod = e.metaKey || e.ctrlKey;

            // Cmd/Ctrl + S → Save request
            if (isMod && e.key === 's') {
                e.preventDefault();
                const activeTab = tabs.find(t => t.id === activeTabId);
                if (!activeTab) return;

                if (activeTab.savedToCollection) {
                    // Update existing item
                    const { collectionId, itemId } = activeTab.savedToCollection;
                    const collection = collections.find(c => c.id === collectionId);
                    if (collection) {
                        const itemToUpdate = collection.items.find(i => i.id === itemId);
                        if (itemToUpdate && itemToUpdate.type === 'request') {
                            await updateItem({
                                ...itemToUpdate,
                                request: activeTab.request,
                            });
                            await fetchCollections();
                            
                            // Show toast or visual feedback
                            const sendBtn = document.querySelector('.send-btn');
                            if (sendBtn) {
                                const originalText = sendBtn.textContent;
                                sendBtn.textContent = 'Saved!';
                                setTimeout(() => {
                                    if (sendBtn.textContent === 'Saved!') {
                                        sendBtn.textContent = originalText;
                                    }
                                }, 1500);
                            }
                            return;
                        }
                    }
                }
                
                // If not saved or collection item not found, open modal
                onSaveRequested?.();
            }

            // Cmd/Ctrl + Enter → Send request
            if (isMod && e.key === 'Enter') {
                e.preventDefault();
                const sendBtn = document.querySelector('.send-btn') as HTMLButtonElement;
                if (sendBtn && !sendBtn.disabled) {
                    sendBtn.click();
                }
            }

            // Cmd/Ctrl + T → New tab
            if (isMod && e.key === 't') {
                e.preventDefault();
                addTab();
            }

            // Cmd/Ctrl + L → Focus URL input
            if (isMod && e.key === 'l') {
                e.preventDefault();
                const urlInput = document.querySelector('.url-input') as HTMLInputElement;
                if (urlInput) urlInput.focus();
            }
        },
        [addTab, tabs, activeTabId, collections, updateItem, fetchCollections, onSaveRequested]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
