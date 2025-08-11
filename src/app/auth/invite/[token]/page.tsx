import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { invitations, users, organizations } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, UserPlus, Building } from "lucide-react";
import Link from "next/link";

interface InvitePageProps {
  params: {
    token: string;
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = params;
  
  // Find the invitation
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.token, token),
      isNull(invitations.acceptedAt)
    ),
    with: {
      organization: true,
      invitedByUser: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
  });
  
  // Check if invitation exists and is valid
  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/signin">
              <Button>Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Check if invitation is expired
  if (new Date() > invitation.expiresAt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please contact your administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/signin">
              <Button>Go to Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Timer className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-2xl">Frame</span>
          </div>
          <UserPlus className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            {invitation.invitedByUser.name} has invited you to join {invitation.organization.name} on Frame
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <Building className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium">{invitation.organization.name}</p>
                <p className="text-sm text-gray-600">Organization</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium capitalize">{invitation.role}</p>
                <p className="text-sm text-gray-600">Your role</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              To accept this invitation, sign in with your email address:
            </p>
            <p className="font-medium">{invitation.email}</p>
          </div>
          
          <Link href={`/auth/signin?email=${encodeURIComponent(invitation.email)}&token=${token}`}>
            <Button className="w-full">
              Accept Invitation & Sign In
            </Button>
          </Link>
          
          <p className="text-xs text-gray-500 text-center">
            This invitation expires on {invitation.expiresAt.toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}