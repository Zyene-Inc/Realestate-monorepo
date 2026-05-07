"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Building2, Users, ShieldCheck } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="w-full py-6 px-8 lg:px-16 flex justify-between items-center bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <Link href="/">
          <Logo className="h-10 text-foreground" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground font-heading">
          <Link href="/about" className="text-foreground transition-colors uppercase tracking-widest text-[11px]">About Us</Link>
          <Link href="/properties" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">Properties</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">Contact</Link>
          <Link href="/" className="px-6 py-2 rounded-xl border border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-widest transition-all">Sign In</Link>
        </div>
      </header>

      <main className="flex-1 py-20 px-8 lg:px-16 max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-20">
          <h1 className="text-5xl md:text-6xl font-extrabold font-heading tracking-tight text-foreground leading-[1.1]">
            Our <span className="text-accent">Mission</span> & Legacy
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            Committed to driving community growth, providing quality housing, and delivering a world-class tenant experience in Kansas City.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-heading text-foreground">Premium Properties</h3>
                <p className="text-sm text-muted-foreground mt-3 font-medium leading-relaxed">
                  We invest heavily in the restoration and maintenance of historic and modern properties, ensuring top-tier living standards.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-heading text-foreground">Community First</h3>
                <p className="text-sm text-muted-foreground mt-3 font-medium leading-relaxed">
                  Our developments focus on bringing long-term value to Midtown Kansas City and supporting the neighborhoods we operate in.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-10 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold font-heading text-foreground">Trusted Management</h3>
                <p className="text-sm text-muted-foreground mt-3 font-medium leading-relaxed">
                  With our technology-driven tenant portal, we provide transparent, efficient, and secure management for all residents.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center bg-secondary/30 border border-border rounded-[3rem] p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/3" />
          <div className="relative h-[400px] w-full rounded-[2rem] overflow-hidden shadow-xl border border-border group">
            <img src="/about_interior.png" alt="Luxury Interior" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          </div>
          <div className="relative z-10 md:pr-8">
            <h2 className="text-3xl font-bold font-heading text-foreground">Our Philosophy</h2>
            <p className="text-muted-foreground mt-6 font-medium leading-relaxed">
              Founded on the principles of integrity and excellence, Coach Johnson Realty Group continues to set the benchmark for property management in the region. We believe that everyone deserves a safe, beautiful, and professionally managed place to call home. Our spaces are designed to inspire and elevate the standard of living.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-8 px-8 lg:px-16 flex flex-col md:flex-row justify-between items-center text-xs text-muted-foreground border-t border-border bg-card font-medium mt-auto">
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
