
import React from "react";
import { AuthCallbackHandler } from "@/components/auth/AuthCallbackHandler";
import { AuthCallbackStatus } from "@/components/auth/AuthCallbackStatus";

const Callback: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <AuthCallbackStatus status="Processing authentication..." error={null} />
      <AuthCallbackHandler setStatus={() => {}} setError={() => {}} />
    </div>
  );
};

export default Callback;
