"use client";

import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Timer } from "lucide-react";
import Link from "next/link";

const errorMessages = {
  Signin: "Try signing in with a different account.",
  OAuthSignin: "Try signing in with a different account.",
  OAuthCallback: "Try signing in with a different account.",
  OAuthCreateAccount: "Try signing in with a different account.",
  EmailCreateAccount: "Try signing in with a different account.",
  Callback: "Try signing in with a different account.",
  OAuthAccountNotLinked: "To confirm your identity, sign in with the same account you used originally.",
  EmailSignin: "Check your email address.",
  CredentialsSignin: "Sign in failed. Check the details you provided are correct.",
  SessionRequired: "Please sign in to access this page.",
  Default: "Unable to sign in.",
};

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") as keyof typeof errorMessages;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <Timer className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-2xl">Frame</span>
            </div>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>
              {errorMessages[error] || errorMessages.Default}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 text-center">
              {error === "EmailSignin" && (
                <p>
                  Make sure you're using an email address that's been invited to Frame.
                </p>
              )}
              {error === "SessionRequired" && (
                <p>
                  You need to be signed in to access this page.
                </p>
              )}
              {!error && (
                <p>
                  An unexpected error occurred during authentication.
                </p>
              )}
            </div>
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                Try Again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}