/**
 * Lightweight event bus for cross-component communication.
 * Used to dispatch events like "navigate to variable" from the URL bar
 * to the Sidebar environment panel without prop drilling.
 */

type EventCallback = (...args: any[]) => void;

class EventBus {
    private listeners: Map<string, Set<EventCallback>> = new Map();

    on(event: string, callback: EventCallback): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    emit(event: string, ...args: any[]): void {
        this.listeners.get(event)?.forEach(cb => cb(...args));
    }
}

export const appEvents = new EventBus();

// Event constants
export const NAVIGATE_TO_VARIABLE = 'navigate:variable';
