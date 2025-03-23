
interface Chrome {
  runtime: {
    sendMessage: (extensionId: string, message: any, callback?: (response: any) => void) => void;
  };
  storage?: {
    local: {
      get: (keys: string[], callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
    };
    sync?: {
      get: (keys: string[], callback: (result: any) => void) => void;
      set: (items: object, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
    };
  };
}

// Declare chrome on the window object
interface Window {
  chrome?: Chrome;
}
