
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Settings = () => {
  const { user } = useAuth();
  
  // Redirect to auth page if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return (
    <div className="container mx-auto px-4 py-20 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Connected email: <span className="font-medium text-foreground">{user.email}</span>
            </p>
            
            {/* Placeholder for future settings options */}
            <div className="text-muted-foreground">
              More account settings coming soon...
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Platform Connections</CardTitle>
            <CardDescription>Manage your AI platform integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground">
              Platform connection settings will appear here as you connect platforms.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
