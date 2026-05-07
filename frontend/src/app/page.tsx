"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, Mail, ArrowRight, ShieldCheck, Globe } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export default function UnifiedLogin() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    setTimeout(() => {
      if (email.includes("admin")) {
        router.push("/admin/dashboard")
      } else {
        router.push("/tenant/dashboard")
      }
      setIsLoading(false)
    }, 800)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Top Navigation / Brand Bar */}
      <header className="w-full py-6 px-8 lg:px-16 flex justify-between items-center bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <Link href="/">
          <Logo className="h-10 text-foreground" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground font-heading">
          <Link href="/about" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">About Us</Link>
          <Link href="/properties" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">Properties</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">Contact</Link>
          <Button variant="outline" className="rounded-xl px-6 border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-widest">Help Center</Button>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-12 items-center relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Left Section: Institutional Trust */}
        <div className="lg:col-span-7 p-8 lg:p-24 space-y-12 relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-6xl lg:text-7xl font-extrabold font-heading tracking-tight text-foreground leading-[1.1]">
              A Legacy of <span className="text-accent">Excellence</span> in <br />
              Property Management.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed font-medium">
              Coach Johnson Realty Group simplifies the rental experience through technology-driven management and community-focused investment.
            </p>
          </div>
          
          <div className="relative h-72 w-full max-w-3xl rounded-[2rem] overflow-hidden shadow-2xl border border-border group">
             <img src="/hero_exterior.png" alt="Luxury Property Exterior" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
             <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl">
            <div className="flex gap-5 p-6 bg-secondary/30 rounded-3xl border border-border backdrop-blur-sm hover:bg-secondary/50 transition-all">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground font-heading">Secure Payments</h3>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Industry-standard encryption for ACH and card transactions.</p>
              </div>
            </div>
            <div className="flex gap-5 p-6 bg-secondary/30 rounded-3xl border border-border backdrop-blur-sm hover:bg-secondary/50 transition-all">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground font-heading">Community Impact</h3>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Committed to neighborhood growth in Midtown Kansas City.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Clean Login Form */}
        <div className="lg:col-span-5 flex justify-center p-8 lg:pr-24 relative z-10 animate-in fade-in slide-in-from-right-8 duration-1000 delay-150">
          <Card className="w-full max-w-md border-border shadow-2xl shadow-primary/5 bg-card rounded-[2.5rem] overflow-hidden">
            <div className="bg-primary p-10 text-primary-foreground text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              <h2 className="text-3xl font-bold font-heading relative z-10">Portal Access</h2>
              <p className="text-primary-foreground/70 text-sm mt-2 font-medium relative z-10">Please enter your credentials</p>
            </div>
            <CardContent className="p-10 space-y-6">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="name@example.com" 
                      className="pl-12 h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all text-base font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Password</Label>
                    <Link href="/auth/forgot-password" data-testid="forgot-password-link" className="text-[10px] font-bold text-accent hover:underline uppercase tracking-widest font-heading">Forgot?</Link>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-12 h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all text-base font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-widest font-heading transition-all shadow-lg shadow-primary/20 premium-button mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Access Portal"}
                  {!isLoading && <ArrowRight className="w-5 h-5 ml-2" />}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t border-border p-8 bg-secondary/30">
              <p className="text-xs text-center text-muted-foreground font-medium uppercase tracking-widest font-heading font-bold">
                New tenant? <span className="text-primary font-bold cursor-pointer hover:underline ml-1">Activate Account</span>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Simplified Footer */}
      <footer className="py-8 px-8 lg:px-16 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground border-t border-border bg-card font-medium">
        <p className="font-heading font-bold tracking-widest uppercase">© 2026 Coach Johnson Realty Group.</p>
        <div className="flex gap-8 mt-4 md:mt-0 uppercase tracking-widest font-bold font-heading">
          <span className="hover:text-foreground cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Terms of Service</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Accessibility</span>
        </div>
      </footer>
    </div>
  )
}
