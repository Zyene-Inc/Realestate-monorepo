"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react"
import { Logo } from "@/components/logo"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import Link from "next/link"
import { routeForUser } from "@/lib/auth-routing"
import { getErrorMessage } from "@/lib/errors"

export default function TenantLogin() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const user = await login(email, password)
      toast.success("Login successful")
      router.push(routeForUser(user))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Invalid credentials"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50" />
      
      <div className="w-full max-w-md z-10 p-4">
        <div className="flex flex-col items-center mb-10">
          <Logo className="h-16 w-auto mb-4" />
          <p className="text-gray-500 font-medium tracking-wide">Secure Tenant Access</p>
        </div>

        <Card className="border-gray-200 bg-white/80 backdrop-blur-xl shadow-2xl shadow-black/5 rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pb-6 pt-8">
            <CardTitle className="text-2xl font-bold text-black">Tenant Portal</CardTitle>
            <CardDescription className="text-gray-500">
              Sign in to manage your lease, payments, and maintenance requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within:text-black transition-colors" />
                    <Input 
                      type="email" 
                      placeholder="tenant@example.com" 
                      className="bg-gray-50 border-gray-200 text-black pl-12 h-12 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-bold text-gray-700">Password</label>
                    <Link href="/auth/forgot-password" data-testid="tenant-forgot-password" className="text-xs text-gray-500 hover:text-black font-semibold transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-gray-400 group-focus-within:text-black transition-colors" />
                    <Input 
                      type="password" 
                      placeholder="••••••••"
                      className="bg-gray-50 border-gray-200 text-black pl-12 h-12 rounded-xl focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading}
                className="w-full bg-black hover:bg-gray-900 text-white font-bold h-14 rounded-xl transition-all shadow-xl shadow-black/10 group disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    Sign In 
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative py-2 mt-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                <span className="bg-white px-3 text-gray-400">Security Verified</span>
              </div>
            </div>

            <div className="text-center text-sm text-gray-500 mt-6">
              Received an invite? <button className="text-black hover:underline font-bold ml-1 transition-all">Accept Invite</button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-gray-400 text-xs mt-10 font-medium">
          © 2026 Coach Johnson Realty Group. All rights reserved.
        </p>
      </div>
    </div>
  )
}
