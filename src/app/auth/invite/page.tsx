"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, Building } from "lucide-react";

interface InvitationData {
  id: number;
  email: string;
  role: string;
  organizationName: string;
  inviterName: string;
  expiresAt: string;
}

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    // Fetch invitation details
    fetch(`/api/invitations/validate?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setInvitation(data);
        }
      })
      .catch(() => {
        setError("Failed to validate invitation");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!invitation || !token) return;
    
    setAccepting(true);
    
    try {
      // Sign in with the invitation email, which will trigger the invitation acceptance
      const result = await signIn("email", {
        email: invitation.email,
        callbackUrl: "/track",
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to accept invitation");
      } else {
        // Redirect to verification page
        router.push("/auth/verify-request?provider=email");
      }
    } catch (error) {
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 pb-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button onClick={() => router.push("/auth/signin")} variant="outline">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const isExpired = new Date() > new Date(invitation.expiresAt);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">⏱️</span>
              </div>
              <span className="text-xl font-bold">Frame</span>
            </div>
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Join your team on Frame for time tracking and project management
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Building className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">{invitation.organizationName}</h3>
                <p className="text-sm text-blue-700 mt-1">
                  <span className="font-medium">Invited by:</span> {invitation.inviterName}
                </p>
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Role:</span> {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">
              You'll be signing in as:
            </p>
            <p className="font-medium flex items-center justify-center space-x-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span>{invitation.email}</span>
            </p>
          </div>

          {isExpired ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This invitation has expired. Please ask your team admin to send a new invitation.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              <Button 
                onClick={handleAcceptInvitation}
                disabled={accepting}
                className="w-full"
                size="lg"
              >
                {accepting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Accepting Invitation...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Accept Invitation & Sign In</span>
                  </div>
                )}
              </Button>
              
              <p className="text-xs text-center text-gray-500">
                By accepting, you agree to join {invitation.organizationName} on Frame
              </p>
            </div>
          )}

          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Expires on {new Date(invitation.expiresAt).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}