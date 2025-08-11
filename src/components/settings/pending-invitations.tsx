"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Mail, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Invitation {
  id: number;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
  invitedByUser: {
    name: string;
    email: string;
  };
}

export function PendingInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/invitations");
      
      if (!response.ok) {
        throw new Error("Failed to fetch invitations");
      }
      
      const data = await response.json();
      setInvitations(data);
      setError(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch invitations";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvitation = async (invitationId: number, email: string) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel invitation");
      }

      toast.success(`Invitation cancelled for ${email}`);
      
      // Remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to cancel invitation";
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading invitations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Pending Invitations</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchInvitations}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>
      
      {invitations.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-4 border border-gray-200 rounded-lg bg-gray-50">
          <Mail className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p>No pending invitations</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invitations.map((invitation) => {
            const isExpired = new Date() > new Date(invitation.expiresAt);
            
            return (
              <div 
                key={invitation.id} 
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-white"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium truncate">
                      {invitation.email}
                    </p>
                    <Badge 
                      variant={isExpired ? "destructive" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {invitation.role}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        Sent {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
                      </span>
                    </span>
                    
                    <span>
                      {isExpired ? (
                        <span className="text-red-600 font-medium">Expired</span>
                      ) : (
                        <span>
                          Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                        </span>
                      )}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Invited by {invitation.invitedByUser.name}
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}