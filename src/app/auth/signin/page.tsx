"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, Mail, ArrowRight } from "lucide-react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Use our custom magic link API instead of NextAuth email provider
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        setEmailSent(true);
      } else {
        const error = await response.json();
        console.error("Magic link error:", error);
      }
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setIsLoading(true);
    try {
      const result = await signIn("demo", { 
        email: demoEmail,
        callbackUrl: "/track"
      });
      
      if (result?.error) {
        console.error("Demo login error:", result.error);
      }
    } catch (error) {
      console.error("Demo login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                We've sent a magic link to {email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 text-center">
                Click the link in the email to sign in to Frame.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>
              Sign in with your email or try a demo account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Authentication Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  "Sending magic link..."
                ) : (
                  <>
                    Send magic link
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or try demo accounts</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleDemoLogin("owner@demo.com")}
                disabled={isLoading}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                  <div className="text-left">
                    <div className="font-medium">John Owner</div>
                    <div className="text-xs text-gray-500">owner@demo.com</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleDemoLogin("manager@demo.com")}
                disabled={isLoading}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <div className="text-left">
                    <div className="font-medium">Sarah Manager</div>
                    <div className="text-xs text-gray-500">manager@demo.com</div>
                  </div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleDemoLogin("designer@demo.com")}
                disabled={isLoading}
              >
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div className="text-left">
                    <div className="font-medium">Mike Designer</div>
                    <div className="text-xs text-gray-500">designer@demo.com</div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}