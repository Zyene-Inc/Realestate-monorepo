"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, PieChart, TrendingUp, Download, Calendar } from "lucide-react"

export default function AdminReports() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-heading tracking-tight text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2 font-medium">Track financial performance and property occupancy.</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" className="rounded-2xl border-border bg-card shadow-sm text-[10px] font-bold uppercase tracking-widest font-heading hover:bg-secondary transition-all gap-2 h-14 px-6">
            <Calendar className="w-4 h-4" />
            Last 30 Days
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 px-8 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all font-heading group">
            <Download className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform text-accent" />
            Download All
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Net Revenue", value: "$142,500", trend: "+8.2%", icon: TrendingUp, positive: true },
          { title: "Occupancy Rate", value: "98.2%", trend: "+1.4%", icon: BarChart3, positive: true },
          { title: "Average Rent", value: "$1,450", trend: "+2.1%", icon: PieChart, positive: true },
          { title: "Collection Rate", value: "94.5%", trend: "-0.5%", icon: TrendingUp, positive: false },
        ].map((stat, i) => (
          <Card key={i} className="border-border bg-card shadow-sm hover:shadow-md transition-all rounded-3xl group relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground font-heading">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-foreground font-heading tabular-nums">{stat.value}</div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-3 font-heading ${stat.positive ? 'text-green-600' : 'text-destructive'}`}>
                {stat.trend} from last month
              </p>
              <div className="absolute right-0 top-0 w-24 h-24 bg-secondary/50 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-110 opacity-50" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="col-span-1 border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
            <CardTitle className="text-xl font-bold font-heading tracking-tight">Revenue by Property</CardTitle>
            <CardDescription className="text-muted-foreground font-medium mt-1">Monthly income breakdown per location.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-end justify-between gap-3 pt-10 px-8 pb-8">
            {[60, 45, 80, 55, 70, 90].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div 
                  className="w-full bg-secondary rounded-t-xl transition-all duration-500 group-hover:bg-primary relative" 
                  style={{ height: `${h}%` }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-foreground text-background text-[10px] font-bold px-2 py-1 rounded-md">
                    ${h}k
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">P{i+1}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border bg-card shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-secondary/30 border-b border-border py-6 px-8">
            <CardTitle className="text-xl font-bold font-heading tracking-tight">Maintenance Costs</CardTitle>
            <CardDescription className="text-muted-foreground font-medium mt-1">Operational expenses for repairs and vendors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-8">
            {[
              { label: "Plumbing", amount: "$4,200", color: "bg-primary" },
              { label: "HVAC", amount: "$3,800", color: "bg-primary/80" },
              { label: "Electrical", amount: "$1,500", color: "bg-accent" },
              { label: "General", amount: "$2,100", color: "bg-secondary-foreground/20" },
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-foreground font-heading">{item.label}</span>
                  <span className="font-bold text-muted-foreground tabular-nums">{item.amount}</span>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${Math.random() * 50 + 20}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
