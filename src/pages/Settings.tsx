
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="container mx-auto pt-24 px-4 pb-16">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="grid gap-8 max-w-4xl mx-auto">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Email Address</h3>
                <p className="text-slate-600 dark:text-slate-400">{user?.email}</p>
              </div>
              
              <div className="pt-2">
                <Button variant="outline">Change Password</Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Interface Preferences</CardTitle>
              <CardDescription>Customize your gallery experience</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Use dark theme for the interface
                    </p>
                  </div>
                  <Switch id="dark-mode" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notifications</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Get notified about new images and updates
                    </p>
                  </div>
                  <Switch id="notifications" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Integrations */}
          <Card>
            <CardHeader>
              <CardTitle>AI Integrations</CardTitle>
              <CardDescription>Manage your connected AI art platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="font-bold text-blue-600">M</span>
                      </div>
                      <div>
                        <h3 className="font-medium">Midjourney</h3>
                        <p className="text-sm text-slate-500">Connected</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Manage</Button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Last synced: Today at 2:45 PM
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="font-bold text-purple-600">D</span>
                      </div>
                      <div>
                        <h3 className="font-medium">DALL-E</h3>
                        <p className="text-sm text-slate-500">Not connected</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Connect to import your DALL-E generations
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="font-bold text-green-600">S</span>
                      </div>
                      <div>
                        <h3 className="font-medium">Stable Diffusion</h3>
                        <p className="text-sm text-slate-500">Not connected</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <p className="text-sm text-slate-600">
                    Connect to import your Stable Diffusion generations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Storage */}
          <Card>
            <CardHeader>
              <CardTitle>Storage</CardTitle>
              <CardDescription>Manage your image storage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">Storage Used</p>
                    <p className="text-sm">250MB / 1GB</p>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: '25%' }}></div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button variant="outline">Manage Storage</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
