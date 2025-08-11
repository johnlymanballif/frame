import { getCurrentUser, hasManagerAccess, hasOwnerAccess } from "@/lib/authz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { InviteForm } from "@/components/settings/invite-form";
import { PendingInvitations } from "@/components/settings/pending-invitations";
import { RatesManagement } from "@/components/settings/rates-management";
import { 
  Settings, 
  Users, 
  DollarSign, 
  Clock, 
  Shield, 
  Building,
  Mail,
  Calendar
} from "lucide-react";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const isManager = hasManagerAccess(user.role);
  const isOwner = hasOwnerAccess(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account and organization settings</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">
            <Settings className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
          )}
          {isManager && (
            <TabsTrigger value="rates">
              <DollarSign className="w-4 h-4 mr-2" />
              Rates
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="organization">
              <Building className="w-4 h-4 mr-2" />
              Organization
            </TabsTrigger>
          )}
          {isManager && (
            <TabsTrigger value="integrations">
              <Calendar className="w-4 h-4 mr-2" />
              Integrations
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={user.name || ""} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user.email || ""} disabled />
                </div>
              </div>
              
              <div>
                <Label>Role</Label>
                <div className="mt-2">
                  <Badge variant="secondary" className="capitalize">
                    {user.role}
                  </Badge>
                </div>
              </div>

              <div>
                <Label>Organization</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {user.organization?.name}
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time Tracking Preferences</CardTitle>
              <CardDescription>
                Configure how you track and view time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Input 
                  id="timezone" 
                  defaultValue={user.organization?.timezone || "UTC"} 
                  disabled 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contact your administrator to change timezone settings
                </p>
              </div>

              <div>
                <Label htmlFor="weekStart">Week Start</Label>
                <Input 
                  id="weekStart" 
                  defaultValue={user.organization?.weekStart || "Monday"} 
                  disabled 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Contact your administrator to change week start settings
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite Team Members</CardTitle>
                <CardDescription>
                  Send email invitations to new team members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InviteForm />
                
                <Separator />
                
                <PendingInvitations />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  Current members of your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                        {user.name?.[0] || user.email?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                      <Badge variant="outline">You</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="rates" className="space-y-6">
            <RatesManagement />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="organization" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>
                  Configure organization-wide preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input 
                    id="orgName" 
                    defaultValue={user.organization?.name} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="orgTimezone">Default Timezone</Label>
                    <Input 
                      id="orgTimezone" 
                      defaultValue={user.organization?.timezone} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="orgWeekStart">Week Start Day</Label>
                    <Input 
                      id="orgWeekStart" 
                      defaultValue={user.organization?.weekStart} 
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button>Save Organization Settings</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Security & Access</span>
                </CardTitle>
                <CardDescription>
                  Manage security settings and access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Advanced Security</h3>
                  <p className="text-sm">Configure SSO, 2FA, and other security features</p>
                  <Button variant="outline" className="mt-4" disabled>
                    Configure Security
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Calendar Integration</CardTitle>
                <CardDescription>
                  Sync your time entries with Google Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Calendar Sync</h3>
                  <p className="text-sm">Automatically sync time entries with your calendar events</p>
                  <Button variant="outline" className="mt-4" disabled>
                    Connect Google Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Other Integrations</CardTitle>
                <CardDescription>
                  Connect with project management and communication tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: "Slack", icon: "💬", status: "Available Soon" },
                    { name: "Asana", icon: "📋", status: "Available Soon" },
                    { name: "Figma", icon: "🎨", status: "Available Soon" },
                    { name: "GitHub", icon: "🐙", status: "Available Soon" },
                  ].map((integration) => (
                    <Card key={integration.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{integration.icon}</span>
                          <span className="font-medium">{integration.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {integration.status}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}