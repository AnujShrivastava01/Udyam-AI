"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { GoogleMap, useJsApiLoader, Marker, Circle } from "@react-google-maps/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Search, SlidersHorizontal, Store, Navigation } from "lucide-react";
import { mockFeasibilityReport } from "@/lib/mock-data";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: 25.4358,
  lng: 78.5678, // Jhansi/Bundelkhand area
};

// Brand colored map style
const mapOptions = {
  styles: [
    { featureType: "all", elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0F4C5C" }] }, // Deep Teal
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  ],
  disableDefaultUI: true,
  zoomControl: true,
};

export default function DiscoverPage() {
  const { onboardingInput } = useAppStore();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Search & Filter Bar */}
      <div className="bg-card border-b p-4 shadow-sm z-10 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search locations, business types..." className="pl-9 w-full bg-muted/50" />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <Button variant="outline" size="sm" className="shrink-0"><SlidersHorizontal className="w-4 h-4 mr-2" /> Filters</Button>
          <Badge 
            variant={activeFilter === 'all' ? 'default' : 'secondary'} 
            className="cursor-pointer shrink-0"
            onClick={() => setActiveFilter('all')}
          >All</Badge>
          <Badge 
            variant={activeFilter === 'competitors' ? 'default' : 'secondary'} 
            className="cursor-pointer shrink-0"
            onClick={() => setActiveFilter('competitors')}
          >Competitors</Badge>
          <Badge 
            variant={activeFilter === 'suppliers' ? 'default' : 'secondary'} 
            className="cursor-pointer shrink-0"
            onClick={() => setActiveFilter('suppliers')}
          >Suppliers</Badge>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        
        {/* Map Container */}
        <div className="flex-1 relative bg-muted/20">
          {isLoaded && apiKey ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={13}
              options={mapOptions}
            >
              {mockFeasibilityReport.competitors.map((comp, i) => (
                <Marker 
                  key={i} 
                  position={{ lat: comp.lat, lng: comp.lng }}
                  icon={{
                    path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                    fillColor: "#E88D14", // Accent color
                    fillOpacity: 1,
                    strokeWeight: 1,
                    strokeColor: "#ffffff",
                    scale: 1.5,
                  }}
                />
              ))}
              <Circle
                center={defaultCenter}
                radius={3000} // 3km radius
                options={{
                  fillColor: "#0F4C5C",
                  fillOpacity: 0.1,
                  strokeColor: "#0F4C5C",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                }}
              />
            </GoogleMap>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-card flex-col">
              <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=25.4358,78.5678&zoom=13&size=800x600&maptype=roadmap&style=feature:all|element:labels.text.fill|color:0x333333&style=feature:water|element:geometry|color:0x004c5c|lightness:70')] bg-cover bg-center opacity-40"></div>
              <div className="z-10 bg-background/90 p-6 rounded-xl border shadow-lg text-center max-w-sm backdrop-blur-sm">
                <MapPin className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2">Mock Map View</h3>
                <p className="text-sm text-muted-foreground mb-4">Google Maps API key is not configured. This is a static representation of the hyper-local discovery feature.</p>
                <div className="flex gap-2 justify-center">
                  <div className="flex items-center gap-1 text-xs font-medium text-accent"><div className="w-3 h-3 rounded-full bg-accent" /> Competitor</div>
                  <div className="flex items-center gap-1 text-xs font-medium text-primary"><div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary" /> Potential Zone</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Sidebar (List view) */}
        <div className="hidden lg:block w-96 bg-card border-l overflow-y-auto z-10 shadow-xl">
          <div className="p-4 border-b bg-muted/10 sticky top-0">
            <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" /> Local Businesses
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Showing results within 5km radius</p>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {mockFeasibilityReport.competitors.map((comp, i) => (
              <Card key={i} className="hover:border-primary/50 cursor-pointer transition-colors shadow-sm">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm">{comp.name}</h4>
                      <p className="text-xs text-muted-foreground">{onboardingInput.businessCategory || 'Dairy'}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/20">Running</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {comp.distanceKm} km away</span>
                    <Button variant="ghost" size="sm" className="h-6 text-primary p-0">View Profile</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card className="border-dashed bg-primary/5 border-primary/30">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center py-8">
                <MapPin className="w-8 h-8 text-primary/50 mb-2" />
                <h4 className="font-medium text-sm text-primary">Unserved Zone Detected</h4>
                <p className="text-xs text-muted-foreground mt-1 mb-3">High demand density in North sector with 0 competitors.</p>
                <Button size="sm" className="rounded-full">Select as Location</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
