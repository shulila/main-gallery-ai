
interface Chrome {
  runtime: {
    sendMessage: (extensionId: string | undefined, message: any, callback?: (response: any) => void) => void;
    getURL: (path: string) => string;
    lastError?: {
      message: string;
    };
    id?: string;
  };
  storage?: {
    local: {
      get: (keys: string[] | string | null, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
    sync?: {
      get: (keys: string[] | string | null, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
    session?: {
      get: (keys: string[] | string | null, callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
      clear: (callback?: () => void) => void;
    };
    onChanged?: {
      addListener: (callback: (changes: object, areaName: string) => void) => void;
      removeListener: (callback: (changes: object, areaName: string) => void) => void;
    };
  };
  notifications?: {
    create: (
      notificationId: string | undefined,
      options: {
        type: string;
        iconUrl: string;
        title: string;
        message: string;
      },
      callback?: (notificationId: string) => void
    ) => void;
    clear: (notificationId: string, callback?: (wasCleared: boolean) => void) => void;
    getAll: (callback: (notifications: { [key: string]: any }) => void) => void;
  };
  tabs?: {
    query: (queryInfo: any, callback: (result: any[]) => void) => void;
    create: (createProperties: any, callback?: (tab: any) => void) => void;
    update: (tabId: number, updateProperties: any, callback?: (tab: any) => void) => void;
    remove: (tabIds: number | number[], callback?: () => void) => void;
    onUpdated?: {
      addListener: (callback: (tabId: number, changeInfo: any, tab: any) => void) => void;
      removeListener: (callback: (tabId: number, changeInfo: any, tab: any) => void) => void;
    };
    onRemoved?: {
      addListener: (callback: (tabId: number, removeInfo: any) => void) => void;
    };
  };
  windows?: {
    update: (windowId: number, updateInfo: any, callback?: (window: any) => void) => void;
    get: (windowId: number, getInfo: any, callback: (window: any) => void) => void;
    getAll: (getInfo: any, callback: (windows: any[]) => void) => void;
  };
  webNavigation?: {
    onCompleted: {
      addListener: (callback: (details: any) => void, filters?: any) => void;
    };
  };
  action?: {
    openPopup: () => void;
    onClicked: {
      addListener: (callback: (tab: any) => void) => void;
      removeListener: (callback: (tab: any) => void) => void;
    };
  };
}

// Declare chrome on the window object
interface Window {
  chrome?: Chrome;
}
