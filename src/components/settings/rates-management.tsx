"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, UserCheck, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, parseCurrency } from "@/lib/utils";

interface UserRate {
  id: number;
  name: string;
  email: string;
  role: "member" | "manager" | "owner";
  costRateCents: number;
  billRateCents: number;
  active: boolean;
}

interface RoleDefaultRate {
  id: number;
  orgId: number;
  roleName: "member" | "manager" | "owner";
  costRateCents: number;
  billRateCents: number;
}

export function RatesManagement() {
  const [users, setUsers] = useState<UserRate[]>([]);
  const [roleRates, setRoleRates] = useState<RoleDefaultRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersResponse, rolesResponse] = await Promise.all([
        fetch("/api/rates/users"),
        fetch("/api/rates/roles"),
      ]);

      if (usersResponse.ok && rolesResponse.ok) {
        const usersData = await usersResponse.json();
        const rolesData = await rolesResponse.json();
        setUsers(usersData);
        setRoleRates(rolesData);
      }
    } catch (error) {
      console.error("Error loading rates:", error);
      toast({
        title: "Error",
        description: "Failed to load rates data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRate = async (userId: number, costRateCents: number, billRateCents: number) => {
    try {
      setSaving(`user-${userId}`);
      const response = await fetch("/api/rates/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, costRateCents, billRateCents }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        toast({
          title: "Success",
          description: "User rates updated successfully",
        });
      } else {
        throw new Error("Failed to update user rates");
      }
    } catch (error) {
      console.error("Error updating user rates:", error);
      toast({
        title: "Error",
        description: "Failed to update user rates",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const updateRoleRate = async (roleName: string, costRateCents: number, billRateCents: number) => {
    try {
      setSaving(`role-${roleName}`);
      const response = await fetch("/api/rates/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName, costRateCents, billRateCents }),
      });

      if (response.ok) {
        const updatedRole = await response.json();
        setRoleRates(prev => prev.map(r => r.roleName === roleName ? updatedRole : r));
        toast({
          title: "Success",
          description: `${roleName} default rates updated successfully`,
        });
      } else {
        throw new Error("Failed to update role rates");
      }
    } catch (error) {
      console.error("Error updating role rates:", error);
      toast({
        title: "Error",
        description: "Failed to update role rates",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // currency helpers provided by utils

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading rates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="role-defaults" className="space-y-6">
        <TabsList>
          <TabsTrigger value="role-defaults">
            <UserCheck className="w-4 h-4 mr-2" />
            Role Defaults
          </TabsTrigger>
          <TabsTrigger value="individual-users">
            <Users className="w-4 h-4 mr-2" />
            Individual Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="role-defaults" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5" />
                <span>Role Default Rates</span>
              </CardTitle>
              <CardDescription>
                Set default cost and billing rates by role. These rates are applied to new users and used as fallbacks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {roleRates.map((role) => (
                <RoleRateEditor
                  key={role.roleName}
                  role={role}
                  onUpdate={updateRoleRate}
                  saving={saving === `role-${role.roleName}`}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual-users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Individual User Rates</span>
              </CardTitle>
              <CardDescription>
                Override default rates for specific team members. Individual rates take precedence over role defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {users.map((user) => (
                <UserRateEditor
                  key={user.id}
                  user={user}
                  onUpdate={updateUserRate}
                  saving={saving === `user-${user.id}`}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface RoleRateEditorProps {
  role: RoleDefaultRate;
  onUpdate: (roleName: string, costRateCents: number, billRateCents: number) => void;
  saving: boolean;
}

function RoleRateEditor({ role, onUpdate, saving }: RoleRateEditorProps) {
  const [costRate, setCostRate] = useState(formatCurrency(role.costRateCents));
  const [billRate, setBillRate] = useState(formatCurrency(role.billRateCents));

  const handleSave = () => {
    const costRateCents = parseCurrency(costRate);
    const billRateCents = parseCurrency(billRate);
    onUpdate(role.roleName, costRateCents, billRateCents);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-medium capitalize">{role.roleName}</h4>
          <p className="text-sm text-gray-500">Default rates for {role.roleName} role</p>
        </div>
        <Badge variant="outline" className="capitalize">
          {role.roleName}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`cost-${role.roleName}`}>Cost Rate (per hour)</Label>
          <Input
            id={`cost-${role.roleName}`}
            value={costRate}
            onChange={(e) => setCostRate(e.target.value)}
            placeholder="$50.00"
          />
        </div>
        <div>
          <Label htmlFor={`bill-${role.roleName}`}>Billing Rate (per hour)</Label>
          <Input
            id={`bill-${role.roleName}`}
            value={billRate}
            onChange={(e) => setBillRate(e.target.value)}
            placeholder="$100.00"
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface UserRateEditorProps {
  user: UserRate;
  onUpdate: (userId: number, costRateCents: number, billRateCents: number) => void;
  saving: boolean;
}

function UserRateEditor({ user, onUpdate, saving }: UserRateEditorProps) {
  const [costRate, setCostRate] = useState(formatCurrency(user.costRateCents));
  const [billRate, setBillRate] = useState(formatCurrency(user.billRateCents));

  const handleSave = () => {
    const costRateCents = parseCurrency(costRate);
    const billRateCents = parseCurrency(billRate);
    onUpdate(user.id, costRateCents, billRateCents);
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user.name?.[0] || user.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <h4 className="font-medium">{user.name}</h4>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="capitalize">
            {user.role}
          </Badge>
          {!user.active && (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`cost-${user.id}`}>Cost Rate (per hour)</Label>
          <Input
            id={`cost-${user.id}`}
            value={costRate}
            onChange={(e) => setCostRate(e.target.value)}
            placeholder="$50.00"
            disabled={!user.active}
          />
        </div>
        <div>
          <Label htmlFor={`bill-${user.id}`}>Billing Rate (per hour)</Label>
          <Input
            id={`bill-${user.id}`}
            value={billRate}
            onChange={(e) => setBillRate(e.target.value)}
            placeholder="$100.00"
            disabled={!user.active}
          />
        </div>
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={saving || !user.active}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}