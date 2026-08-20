"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import Link from "next/link"
import { navigateToUserPortal } from "@/lib/auth-routing"
import { getErrorMessage } from "@/lib/errors"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login, user, isLoading: isAuthLoading } = useAuth()

  useEffect(() => {
    if (!isAuthLoading && user) navigateToUserPortal(router, user, "replace")
  }, [isAuthLoading, router, user])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(email, password)
      toast.success("Login successful")
      navigateToUserPortal(router, user)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Invalid credentials"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-2xl rounded-3xl border-gray-100 overflow-hidden">
        <CardHeader className="space-y-1 p-8 pb-4">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/10">
              <span className="text-white font-black italic text-3xl">C</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-black italic text-center uppercase tracking-tighter">Admin Login</CardTitle>
          <CardDescription className="text-center font-medium text-gray-500">
            Institutional access for Coach Johnson Management
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email Address</label>
              <Input 
                type="email" 
                placeholder="admin@coachjohnsonrealty.com" 
                className="h-14 rounded-xl border-gray-100 focus:ring-black"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Password</label>
                <Link href="/auth/forgot-password" data-testid="admin-forgot-password" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black">Forgot?</Link>
              </div>
              <Input 
                type="password" 
                className="h-14 rounded-xl border-gray-100 focus:ring-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 bg-black hover:bg-gray-900 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-black/10 mt-4"
              disabled={loading}
            >
              {loading ? "Authenticating..." : "Login to Dashboard"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
