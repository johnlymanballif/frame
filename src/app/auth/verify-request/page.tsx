import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Timer } from "lucide-react";
import Link from "next/link";

export default function VerifyRequest() {
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
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              A sign-in link has been sent to your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Click the link in the email to sign in to Frame. You can close this window.
            </p>
            <Link 
              href="/auth/signin" 
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}