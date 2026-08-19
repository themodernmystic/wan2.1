import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import TopBar from '@/components/layout/TopBar';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Palette, Globe, Shield, Bell, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [brandSettings, setBrandSettings] = useState({
    brand_name: '',
    brand_voice: '',
    primary_color: '#6366f1',
    secondary_color: '#8b5cf6',
    default_language: 'English',
    default_tone: 'professional',
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.brand_name) {
        setBrandSettings(prev => ({
          ...prev,
          brand_name: u.brand_name || '',
          brand_voice: u.brand_voice || '',
          primary_color: u.primary_color || '#6366f1',
          secondary_color: u.secondary_color || '#8b5cf6',
          default_language: u.default_language || 'English',
          default_tone: u.default_tone || 'professional',
        }));
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(brandSettings);
    setSaving(false);
    toast.success('Settings saved!');
  };

  return (
    <div className="min-h-screen">
      <TopBar title="Settings" />
      <div className="p-6 animate-fade-in">
        <PageHeader title="Settings" description="Configure your platform preferences and brand settings" />

        <Tabs defaultValue="brand" className="space-y-6">
          <TabsList>
            <TabsTrigger value="brand" className="gap-2"><Palette className="w-4 h-4" /> Brand</TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2"><Globe className="w-4 h-4" /> Integrations</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="brand">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Brand Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Brand Name</Label>
                    <Input
                      value={brandSettings.brand_name}
                      onChange={e => setBrandSettings({ ...brandSettings, brand_name: e.target.value })}
                      placeholder="Your Brand Name"
                    />
                  </div>
                  <div>
                    <Label>Brand Voice / Tone Description</Label>
                    <Textarea
                      value={brandSettings.brand_voice}
                      onChange={e => setBrandSettings({ ...brandSettings, brand_voice: e.target.value })}
                      placeholder="Describe your brand's voice and tone..."
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={brandSettings.primary_color}
                          onChange={e => setBrandSettings({ ...brandSettings, primary_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <Input value={brandSettings.primary_color} onChange={e => setBrandSettings({ ...brandSettings, primary_color: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                    <div>
                      <Label>Secondary Color</Label>
                      <div className="flex gap-2 mt-1">
                        <input
                          type="color"
                          value={brandSettings.secondary_color}
                          onChange={e => setBrandSettings({ ...brandSettings, secondary_color: e.target.value })}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <Input value={brandSettings.secondary_color} onChange={e => setBrandSettings({ ...brandSettings, secondary_color: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Default Preferences</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Default Language</Label>
                    <Input
                      value={brandSettings.default_language}
                      onChange={e => setBrandSettings({ ...brandSettings, default_language: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Default Tone</Label>
                    <Input
                      value={brandSettings.default_tone}
                      onChange={e => setBrandSettings({ ...brandSettings, default_tone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-generate alt text</p>
                        <p className="text-xs text-muted-foreground">Automatically generate alt text for media</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">SEO auto-optimization</p>
                        <p className="text-xs text-muted-foreground">Automatically optimize content for SEO</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Accessibility checks</p>
                        <p className="text-xs text-muted-foreground">Run accessibility checks on content</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end mt-6">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'OpenAI', description: 'GPT models for text generation', status: 'Built-in' },
                  { name: 'Image Generation', description: 'AI-powered image creation', status: 'Built-in' },
                  { name: 'Hugging Face', description: 'Open source AI models', status: 'Available' },
                  { name: 'ElevenLabs', description: 'AI voice synthesis', status: 'Available' },
                  { name: 'D-ID', description: 'AI video generation', status: 'Available' },
                  { name: 'DeepL', description: 'Translation service', status: 'Available' },
                ].map(integration => (
                  <div key={integration.name} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">{integration.description}</p>
                    </div>
                    <Badge variant={integration.status === 'Built-in' ? 'default' : 'outline'}>
                      {integration.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Content generation complete', description: 'Get notified when AI finishes generating content' },
                  { label: 'Translation complete', description: 'Notifications for completed translations' },
                  { label: 'SEO score alerts', description: 'Alert when content SEO score drops below threshold' },
                  { label: 'Accessibility issues', description: 'Notifications for accessibility problems' },
                  { label: 'Task assignments', description: 'When you are assigned a new task' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}