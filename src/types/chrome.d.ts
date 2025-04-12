
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
  };
}

// Declare chrome on the window object
interface Window {
  chrome?: Chrome;
}
