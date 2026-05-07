"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Building2, MapPin, BedDouble, Bath } from "lucide-react"
import { Logo } from "@/components/logo"
import Link from "next/link"

export default function PublicPropertiesPage() {
  const properties = [
    {
      id: "1",
      name: "Neyan's Place",
      address: "2411 E 10th St, Kansas City, MO",
      type: "Six-plex",
      description: "Historic six-plex redevelopment. Quality community housing in Midtown.",
      featured: true,
      image: "/neyans_place.png"
    },
    {
      id: "2",
      name: "Oakwood Apartments",
      address: "123 Main St, Kansas City, MO",
      type: "Multi-Family",
      description: "Luxury apartments in downtown KC featuring modern amenities.",
      featured: false,
      image: "/oakwood.png"
    },
    {
      id: "3",
      name: "Sunset Duplex",
      address: "456 Oak Ave, Kansas City, MO",
      type: "Duplex",
      description: "Quiet residential duplex with private gardens and off-street parking.",
      featured: false,
      image: null
    }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="w-full py-6 px-8 lg:px-16 flex justify-between items-center bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
        <Link href="/">
          <Logo className="h-10 text-foreground" />
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-muted-foreground font-heading">
          <Link href="/about" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">About Us</Link>
          <Link href="/properties" className="text-foreground transition-colors uppercase tracking-widest text-[11px]">Properties</Link>
          <Link href="/contact" className="hover:text-foreground transition-colors uppercase tracking-widest text-[11px]">Contact</Link>
          <Link href="/" className="px-6 py-2 rounded-xl border border-border hover:bg-secondary text-[11px] font-bold uppercase tracking-widest transition-all">Sign In</Link>
        </div>
      </header>

      <main className="flex-1 py-20 px-8 lg:px-16 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center max-w-3xl mx-auto space-y-6 mb-20">
          <h1 className="text-5xl md:text-6xl font-extrabold font-heading tracking-tight text-foreground leading-[1.1]">
            Our <span className="text-accent">Portfolio</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium leading-relaxed">
            Explore our curated selection of high-quality residential properties across the Kansas City area.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {properties.map((property) => (
            <Card key={property.id} className={`border-border bg-card shadow-sm hover:shadow-md transition-all rounded-[2rem] overflow-hidden group ${property.featured ? 'lg:col-span-2' : 'col-span-1'}`}>
              <div className="h-64 bg-secondary flex items-center justify-center relative overflow-hidden">
                {property.image ? (
                  <img src={property.image} alt={property.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                ) : (
                  <Building2 className="w-16 h-16 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-700" />
                )}
                {property.featured && (
                  <div className="absolute top-6 right-6 px-4 py-2 bg-accent/90 backdrop-blur-md text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-xl font-heading shadow-lg">
                    Featured Project
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              </div>
              <CardContent className="p-8 relative z-10 -mt-10">
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <h3 className="text-2xl font-bold font-heading text-foreground">{property.name}</h3>
                  <div className="flex items-center gap-2 mt-3 text-sm font-bold text-muted-foreground font-heading uppercase tracking-widest">
                    <MapPin className="w-4 h-4 text-primary" />
                    {property.address}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 font-medium leading-relaxed">
                    {property.description}
                  </p>
                  <div className="flex gap-4 mt-6 pt-6 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                        <BedDouble className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-bold font-heading">{property.type}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
