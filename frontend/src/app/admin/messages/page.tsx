"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Search, Send, User } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function AdminMessages() {
  const conversations = [
    { id: "1", tenant: "John Doe", lastMessage: "When will the AC be fixed?", date: "10:30 AM", unread: true },
    { id: "2", tenant: "Jane Smith", lastMessage: "Rent payment sent via ACH", date: "Yesterday", unread: false },
    { id: "3", tenant: "Robert Johnson", lastMessage: "I received the invite, thanks!", date: "2 days ago", unread: false },
  ]

  return (
    <div className="h-[calc(100vh-100px)] flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-80 flex flex-col gap-6 flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-2 font-medium">Tenant communications</p>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input className="pl-12 h-12 rounded-2xl border-border bg-card shadow-sm focus:border-primary transition-all font-medium" placeholder="Search conversations..." />
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {conversations.map((conv) => (
            <div 
              key={conv.id} 
              className={cn(
                "p-5 rounded-2xl cursor-pointer border transition-all duration-300",
                conv.unread ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card border-border hover:border-primary/30 hover:shadow-md"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "font-bold text-sm font-heading",
                  conv.unread ? "text-primary" : "text-foreground"
                )}>{conv.tenant}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest font-heading">{conv.date}</span>
              </div>
              <p className={cn(
                "text-[11px] truncate font-medium",
                conv.unread ? "text-foreground font-bold" : "text-muted-foreground"
              )}>{conv.lastMessage}</p>
            </div>
          ))}
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card shadow-sm rounded-3xl min-w-0">
        <div className="p-6 border-b border-border flex items-center gap-4 bg-secondary/30">
          <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center border border-border">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-bold text-foreground font-heading text-lg tracking-tight">John Doe</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Active Tenant • Unit A1</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-background/50">
          <div className="flex justify-start">
            <div className="max-w-[70%] p-4 bg-secondary text-foreground border border-border rounded-3xl rounded-tl-sm text-sm shadow-sm font-medium leading-relaxed">
              Hello, the AC in my unit stopped working this morning. It's making a loud rattling noise.
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[70%] p-4 bg-primary text-primary-foreground rounded-3xl rounded-tr-sm text-sm shadow-sm shadow-primary/10 font-medium leading-relaxed">
              Hi John, sorry to hear that. I've assigned CoolAir HVAC to check it out. They should be there by 2pm today.
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[70%] p-4 bg-secondary text-foreground border border-border rounded-3xl rounded-tl-sm text-sm shadow-sm font-medium leading-relaxed">
              Great, thank you! I'll be home.
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-card">
          <div className="flex gap-3 bg-secondary/50 p-2 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
            <Input 
              placeholder="Type a message to John Doe..." 
              className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 h-14 text-sm font-medium placeholder:text-muted-foreground/60" 
            />
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 w-14 rounded-xl transition-all shadow-lg shadow-primary/20 shrink-0">
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
