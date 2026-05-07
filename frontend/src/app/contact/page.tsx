"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Send } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="w-full py-6 px-8 lg:px-16 flex justify-between items-center bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <Link href="/">
          <Logo className="h-10 text-foreground" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground font-heading">
          <Link href="/about" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">About Us</Link>
          <Link href="/properties" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">Properties</Link>
          <Link href="/contact" className="text-foreground transition-colors uppercase tracking-widest text-[11px]">Contact</Link>
          <Link href="/" className="px-6 py-2 rounded-xl border border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-widest transition-all">Sign In</Link>
        </div>
      </header>

      <main className="flex-1 py-20 px-8 lg:px-16 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-20">
          <h1 className="text-5xl md:text-6xl font-extrabold font-heading tracking-tight text-foreground leading-[1.1]">
            Get in <span className="text-accent">Touch</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            Have questions about a property or need management services? Our team is ready to assist you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-8 flex gap-6 items-center">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Email Us</h3>
                  <p className="text-lg font-bold text-foreground font-heading mt-1">contact@coachjohnsonrealty.com</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-8 flex gap-6 items-center">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Phone className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Call Us</h3>
                  <p className="text-lg font-bold text-foreground font-heading mt-1">(816) 555-0123</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-8 flex gap-6 items-center">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Visit Us</h3>
                  <p className="text-lg font-bold text-foreground font-heading mt-1">456 Realty Dr, Kansas City, MO 64101</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="border-border bg-card shadow-xl shadow-primary/5 rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-10 space-y-8">
              <div>
                <h3 className="text-2xl font-bold font-heading text-foreground">Send a Message</h3>
                <p className="text-sm text-muted-foreground mt-2 font-medium">We'll get back to you as soon as possible.</p>
              </div>
              
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">First Name</Label>
                    <Input placeholder="John" className="h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all font-medium" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Last Name</Label>
                    <Input placeholder="Doe" className="h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all font-medium" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Email Address</Label>
                  <Input type="email" placeholder="john@example.com" className="h-14 rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all font-medium" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 font-heading">Message</Label>
                  <Textarea placeholder="How can we help you?" className="min-h-[150px] rounded-2xl border-border bg-secondary/50 focus:bg-background focus:border-primary transition-all font-medium p-4" />
                </div>
                <Button className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold uppercase tracking-widest font-heading transition-all shadow-lg shadow-primary/20 premium-button mt-4">
                  Send Message
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </CardContent>
          </Card>
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
