"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, User, Search, Clock, Megaphone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function TenantMessages() {
  const messages = [
    { id: 1, sender: "Property Manager", body: "Hello John, just confirming that the HVAC technician is on the way.", time: "10:30 AM", isMe: false },
    { id: 2, sender: "John Doe", body: "Great, thank you! I will be home to let them in.", time: "10:35 AM", isMe: true },
    { id: 3, sender: "Property Manager", body: "Perfect. They should arrive within the next 30 minutes.", time: "10:40 AM", isMe: false },
  ]

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 h-[calc(100vh-100px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-2 font-medium">Direct communication with Coach Johnson Management.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-8 min-h-0">
        <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card shadow-sm rounded-3xl h-full">
          <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-2xl font-heading shadow-md shadow-primary/20">
                M
              </div>
              <div>
                <h3 className="font-bold text-foreground tracking-tight text-lg font-heading">Management Support</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest font-heading">Online</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background/50">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.isMe ? "justify-end" : "justify-start")}>
                <div className="flex flex-col gap-1.5 max-w-[70%]">
                  <div className={cn(
                    "p-5 shadow-sm font-medium leading-relaxed text-sm",
                    msg.isMe 
                      ? "bg-primary text-primary-foreground rounded-3xl rounded-tr-sm shadow-primary/10" 
                      : "bg-secondary text-foreground border border-border rounded-3xl rounded-tl-sm"
                  )}>
                    <p>{msg.body}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading",
                    msg.isMe ? "text-right" : "text-left"
                  )}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 border-t border-border bg-card">
            <div className="flex gap-3 bg-secondary/50 p-2 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <Input 
                placeholder="Type your message to management..." 
                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 h-14 text-sm font-medium placeholder:text-muted-foreground/60" 
              />
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 w-14 rounded-xl transition-all shadow-lg shadow-primary/20 shrink-0">
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        <div className="w-80 space-y-8 hidden lg:block overflow-y-auto pr-2">
          <Card className="border-border bg-card shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Button variant="outline" className="w-full justify-start gap-3 rounded-xl border-border hover:bg-secondary text-xs font-bold uppercase tracking-widest h-12 font-heading transition-all">
                <Clock className="w-4 h-4 text-muted-foreground" /> Message History
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 rounded-xl border-border hover:bg-secondary text-xs font-bold uppercase tracking-widest h-12 font-heading transition-all">
                <User className="w-4 h-4 text-muted-foreground" /> Contact Info
              </Button>
            </CardContent>
          </Card>

          <div className="p-8 bg-primary rounded-3xl shadow-xl shadow-primary/30 text-primary-foreground relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700">
              <Megaphone className="h-24 w-24 -mr-8 -mt-8" />
            </div>
            <h4 className="font-bold font-heading tracking-tight text-xl mb-4 relative z-10">Emergency Help?</h4>
            <p className="text-[10px] text-primary-foreground/80 font-medium uppercase tracking-[0.1em] leading-relaxed relative z-10">
              For immediate maintenance emergencies after hours, please call our 24/7 hotline directly.
            </p>
            <Button className="mt-8 w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl py-6 transition-all shadow-lg shadow-black/20 premium-button font-heading relative z-10">
              Call Hotline
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
