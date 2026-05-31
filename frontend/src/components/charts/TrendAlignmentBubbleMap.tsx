import React, { useState, useRef, useCallback, useMemo } from "react"

interface Product {
  name: string
  sku: string
  category: string
  price: number
}

interface TrendData {
  trend: string
  velocity: number
  alignment: number
  size: "large" | "medium" | "small"
  aligned: boolean
  category?: string
  description?: string
  alignedProducts?: Product[]
}

interface BubbleMapProps {
  data?: TrendData[]
  width?: number
  height?: number
  showZoomControls?: boolean
  showLegend?: boolean
  onBubbleClick?: (item: TrendData) => void
}

// All data in a single dictionary (array of objects)
const defaultBubbleMapData: TrendData[] = [
  { 
    trend: "Eco", 
    velocity: 20, 
    alignment: 70, 
    size: "medium", 
    aligned: true, 
    category: "Sustainability",
    alignedProducts: [
      { name: "Organic Cotton T-Shirt", sku: "SUS-1A2B3C", category: "Sustainability", price: 25 },
      { name: "Bamboo Water Bottle", sku: "SUS-4D5E6F", category: "Sustainability", price: 18 },
      { name: "Recycled Notebook", sku: "SUS-7G8H9I", category: "Sustainability", price: 12 },
      { name: "Eco-Friendly Backpack", sku: "SUS-0J1K2L", category: "Sustainability", price: 45 },
      { name: "Organic Honey", sku: "SUS-3M4N5O", category: "Sustainability", price: 15 },
      { name: "Natural Soap Bar", sku: "SUS-6P7Q8R", category: "Sustainability", price: 8 },
      { name: "Herbal Tea Collection", sku: "SUS-9S0T1U", category: "Sustainability", price: 22 },
      { name: "Pure Essential Oils", sku: "SUS-2V3W4X", category: "Sustainability", price: 30 }
    ]
  },
  { 
    trend: "Minimalist", 
    velocity: 40, 
    alignment: 55, 
    size: "large", 
    aligned: false, 
    category: "Design",
    alignedProducts: [
      { name: "Minimalist Desk Lamp", sku: "DES-1A2B3C", category: "Design", price: 40 },
      { name: "Simple Wall Clock", sku: "DES-4D5E6F", category: "Design", price: 25 },
      { name: "Clean Coffee Mug", sku: "DES-7G8H9I", category: "Design", price: 10 },
      { name: "Plain Canvas Bag", sku: "DES-0J1K2L", category: "Design", price: 18 },
      { name: "Bold Geometric Rug", sku: "DES-3M4N5O", category: "Design", price: 60 },
      { name: "Statement Wall Art", sku: "DES-6P7Q8R", category: "Design", price: 80 },
      { name: "Dramatic Floor Lamp", sku: "DES-9S0T1U", category: "Design", price: 120 },
      { name: "Vibrant Throw Pillows", sku: "DES-2V3W4X", category: "Design", price: 35 },
      { name: "Relaxed Fit Shirt", sku: "DES-5Y6Z7A", category: "Design", price: 28 },
      { name: "Easy Slip-On Shoes", sku: "DES-8B9C0D", category: "Design", price: 50 },
      { name: "Classic Aviator Sunglasses", sku: "DES-1E2F3G", category: "Design", price: 90 },
      { name: "Heritage Boots", sku: "DES-4H5I6J", category: "Design", price: 110 }
    ]
  },
  { 
    trend: "Hand", 
    velocity: 55, 
    alignment: 45, 
    size: "large", 
    aligned: false, 
    category: "Artisan",
    alignedProducts: [
      { name: "Handmade Leather Wallet", sku: "ART-1A2B3C", category: "Artisan", price: 30 },
      { name: "Custom Metal Keychain", sku: "ART-4D5E6F", category: "Artisan", price: 10 },
      { name: "Vintage Vinyl Record", sku: "ART-7G8H9I", category: "Artisan", price: 20 },
      { name: "Retro Polaroid Camera", sku: "ART-0J1K2L", category: "Artisan", price: 40 },
      { name: "Classic Typewriter", sku: "ART-3M4N5O", category: "Artisan", price: 50 },
      { name: "Antique Brass Compass", sku: "ART-6P7Q8R", category: "Artisan", price: 25 },
      { name: "Soft Memory Foam Pillow", sku: "ART-9S0T1U", category: "Artisan", price: 35 },
      { name: "Plush Throw Blanket", sku: "ART-2V3W4X", category: "Artisan", price: 45 },
      { name: "Cozy Slippers", sku: "ART-5Y6Z7A", category: "Artisan", price: 20 },
      { name: "Gentle Face Cream", sku: "ART-8B9C0D", category: "Artisan", price: 30 },
      { name: "Wellness Tea Blend", sku: "ART-1E2F3G", category: "Artisan", price: 25 },
      { name: "Meditation Cushion", sku: "ART-4H5I6J", category: "Artisan", price: 40 }
    ]
  },
  { 
    trend: "Retro", 
    velocity: 15, 
    alignment: 30, 
    size: "small", 
    aligned: false, 
    category: "Vintage",
    alignedProducts: [
      { name: "Vintage Denim Jacket", sku: "VIN-1A2B3C", category: "Vintage", price: 100 },
      { name: "Retro Sneakers", sku: "VIN-4D5E6F", category: "Vintage", price: 80 },
      { name: "Classic Aviator Sunglasses", sku: "VIN-7G8H9I", category: "Vintage", price: 90 },
      { name: "Heritage Boots", sku: "VIN-0J1K2L", category: "Vintage", price: 110 },
      { name: "Vintage Vinyl Record", sku: "VIN-3M4N5O", category: "Vintage", price: 20 },
      { name: "Retro Polaroid Camera", sku: "VIN-6P7Q8R", category: "Vintage", price: 40 },
      { name: "Classic Typewriter", sku: "VIN-9S0T1U", category: "Vintage", price: 50 },
      { name: "Antique Brass Compass", sku: "VIN-2V3W4X", category: "Vintage", price: 25 },
      { name: "Vintage Denim Jacket", sku: "VIN-5Y6Z7A", category: "Vintage", price: 100 },
      { name: "Retro Sneakers", sku: "VIN-8B9C0D", category: "Vintage", price: 80 }
    ]
  },
  { 
    trend: "Soft", 
    velocity: 30, 
    alignment: 35, 
    size: "medium", 
    aligned: true, 
    category: "Comfort",
    alignedProducts: [
      { name: "Soft Memory Foam Pillow", sku: "COM-1A2B3C", category: "Comfort", price: 35 },
      { name: "Plush Throw Blanket", sku: "COM-4D5E6F", category: "Comfort", price: 45 },
      { name: "Cozy Slippers", sku: "COM-7G8H9I", category: "Comfort", price: 20 },
      { name: "Gentle Face Cream", sku: "COM-0J1K2L", category: "Comfort", price: 30 },
      { name: "Wellness Tea Blend", sku: "COM-3M4N5O", category: "Comfort", price: 25 },
      { name: "Meditation Cushion", sku: "COM-6P7Q8R", category: "Comfort", price: 40 },
      { name: "Essential Oil Diffuser", sku: "COM-9S0T1U", category: "Comfort", price: 50 },
      { name: "Yoga Mat", sku: "COM-2V3W4X", category: "Comfort", price: 20 },
      { name: "Comfortable Hoodie", sku: "COM-5Y6Z7A", category: "Comfort", price: 50 },
      { name: "Relaxed Fit Shirt", sku: "COM-8B9C0D", category: "Comfort", price: 28 },
      { name: "Easy Slip-On Shoes", sku: "COM-1E2F3G", category: "Comfort", price: 50 }
    ]
  },
  { 
    trend: "Wellness", 
    velocity: 60, 
    alignment: 50, 
    size: "large", 
    aligned: true, 
    category: "Health",
    alignedProducts: [
      { name: "Wellness Tea Blend", sku: "HEA-1A2B3C", category: "Health", price: 25 },
      { name: "Meditation Cushion", sku: "HEA-4D5E6F", category: "Health", price: 40 },
      { name: "Essential Oil Diffuser", sku: "HEA-7G8H9I", category: "Health", price: 50 },
      { name: "Yoga Mat", sku: "HEA-0J1K2L", category: "Health", price: 20 },
      { name: "Organic Honey", sku: "HEA-3M4N5O", category: "Health", price: 15 },
      { name: "Natural Soap Bar", sku: "HEA-6P7Q8R", category: "Health", price: 8 },
      { name: "Herbal Tea Collection", sku: "HEA-9S0T1U", category: "Health", price: 22 },
      { name: "Pure Essential Oils", sku: "HEA-2V3W4X", category: "Health", price: 30 }
    ]
  },
  { 
    trend: "Tech", 
    velocity: 80, 
    alignment: 85, 
    size: "large", 
    aligned: true, 
    category: "Technology",
    alignedProducts: [
      { name: "Smart Home Hub", sku: "TEC-1A2B3C", category: "Technology", price: 100 },
      { name: "Wireless Earbuds", sku: "TEC-4D5E6F", category: "Technology", price: 80 },
      { name: "Fitness Tracker", sku: "TEC-7G8H9I", category: "Technology", price: 50 },
      { name: "Portable Charger", sku: "TEC-0J1K2L", category: "Technology", price: 30 },
      { name: "Vintage Denim Jacket", sku: "TEC-3M4N5O", category: "Technology", price: 100 },
      { name: "Retro Sneakers", sku: "TEC-6P7Q8R", category: "Technology", price: 80 },
      { name: "Classic Aviator Sunglasses", sku: "TEC-9S0T1U", category: "Technology", price: 90 },
      { name: "Heritage Boots", sku: "TEC-2V3W4X", category: "Technology", price: 110 },
      { name: "Vintage Vinyl Record", sku: "TEC-5Y6Z7A", category: "Technology", price: 20 },
      { name: "Retro Polaroid Camera", sku: "TEC-8B9C0D", category: "Technology", price: 40 },
      { name: "Classic Typewriter", sku: "TEC-1E2F3G", category: "Technology", price: 50 },
      { name: "Antique Brass Compass", sku: "TEC-4H5I6J", category: "Technology", price: 25 }
    ]
  },
  { 
    trend: "Vintage", 
    velocity: 25, 
    alignment: 40, 
    size: "medium", 
    aligned: false, 
    category: "Retro",
    alignedProducts: [
      { name: "Vintage Denim Jacket", sku: "RET-1A2B3C", category: "Retro", price: 100 },
      { name: "Retro Sneakers", sku: "RET-4D5E6F", category: "Retro", price: 80 },
      { name: "Classic Aviator Sunglasses", sku: "RET-7G8H9I", category: "Retro", price: 90 },
      { name: "Heritage Boots", sku: "RET-0J1K2L", category: "Retro", price: 110 },
      { name: "Vintage Vinyl Record", sku: "RET-3M4N5O", category: "Retro", price: 20 },
      { name: "Retro Polaroid Camera", sku: "RET-6P7Q8R", category: "Retro", price: 40 },
      { name: "Classic Typewriter", sku: "RET-9S0T1U", category: "Retro", price: 50 },
      { name: "Antique Brass Compass", sku: "RET-2V3W4X", category: "Retro", price: 25 },
      { name: "Vintage Denim Jacket", sku: "RET-5Y6Z7A", category: "Retro", price: 100 },
      { name: "Retro Sneakers", sku: "RET-8B9C0D", category: "Retro", price: 80 }
    ]
  },
  { 
    trend: "Bold", 
    velocity: 45, 
    alignment: 60, 
    size: "medium", 
    aligned: true, 
    category: "Design",
    alignedProducts: [
      { name: "Bold Geometric Rug", sku: "DES-1A2B3C", category: "Design", price: 60 },
      { name: "Statement Wall Art", sku: "DES-4D5E6F", category: "Design", price: 80 },
      { name: "Dramatic Floor Lamp", sku: "DES-7G8H9I", category: "Design", price: 120 },
      { name: "Vibrant Throw Pillows", sku: "DES-0J1K2L", category: "Design", price: 35 },
      { name: "Relaxed Fit Shirt", sku: "DES-3M4N5O", category: "Design", price: 28 },
      { name: "Easy Slip-On Shoes", sku: "DES-6P7Q8R", category: "Design", price: 50 },
      { name: "Classic Aviator Sunglasses", sku: "DES-9S0T1U", category: "Design", price: 90 },
      { name: "Heritage Boots", sku: "DES-2V3W4X", category: "Design", price: 110 }
    ]
  },
  { 
    trend: "Organic", 
    velocity: 35, 
    alignment: 65, 
    size: "large", 
    aligned: true, 
    category: "Natural",
    alignedProducts: [
      { name: "Organic Cotton T-Shirt", sku: "NAT-1A2B3C", category: "Natural", price: 25 },
      { name: "Bamboo Water Bottle", sku: "NAT-4D5E6F", category: "Natural", price: 18 },
      { name: "Recycled Notebook", sku: "NAT-7G8H9I", category: "Natural", price: 12 },
      { name: "Eco-Friendly Backpack", sku: "NAT-0J1K2L", category: "Natural", price: 45 },
      { name: "Organic Honey", sku: "NAT-3M4N5O", category: "Natural", price: 15 },
      { name: "Natural Soap Bar", sku: "NAT-6P7Q8R", category: "Natural", price: 8 },
      { name: "Herbal Tea Collection", sku: "NAT-9S0T1U", category: "Natural", price: 22 },
      { name: "Pure Essential Oils", sku: "NAT-2V3W4X", category: "Natural", price: 30 }
    ]
  },
  { 
    trend: "Luxury", 
    velocity: 70, 
    alignment: 75, 
    size: "large", 
    aligned: true, 
    category: "Premium",
    alignedProducts: [
      { name: "Luxury Silk Scarf", sku: "PRE-1A2B3C", category: "Premium", price: 50 },
      { name: "Premium Leather Bag", sku: "PRE-4D5E6F", category: "Premium", price: 100 },
      { name: "Designer Sunglasses", sku: "PRE-7G8H9I", category: "Premium", price: 80 },
      { name: "Exclusive Perfume", sku: "PRE-0J1K2L", category: "Premium", price: 70 },
      { name: "Organic Cotton T-Shirt", sku: "PRE-3M4N5O", category: "Premium", price: 25 },
      { name: "Bamboo Water Bottle", sku: "PRE-6P7Q8R", category: "Premium", price: 18 },
      { name: "Recycled Notebook", sku: "PRE-9S0T1U", category: "Premium", price: 12 },
      { name: "Eco-Friendly Backpack", sku: "PRE-2V3W4X", category: "Premium", price: 45 },
      { name: "Organic Honey", sku: "PRE-5Y6Z7A", category: "Premium", price: 15 },
      { name: "Natural Soap Bar", sku: "PRE-8B9C0D", category: "Premium", price: 8 },
      { name: "Herbal Tea Collection", sku: "PRE-1E2F3G", category: "Premium", price: 22 },
      { name: "Pure Essential Oils", sku: "PRE-4H5I6J", category: "Premium", price: 30 }
    ]
  },
  { 
    trend: "Casual", 
    velocity: 50, 
    alignment: 45, 
    size: "medium", 
    aligned: false, 
    category: "Lifestyle",
    alignedProducts: [
      { name: "Casual Denim Jeans", sku: "LIF-1A2B3C", category: "Lifestyle", price: 50 },
      { name: "Comfortable Hoodie", sku: "LIF-4D5E6F", category: "Lifestyle", price: 50 },
      { name: "Relaxed Fit Shirt", sku: "LIF-7G8H9I", category: "Lifestyle", price: 28 },
      { name: "Easy Slip-On Shoes", sku: "LIF-0J1K2L", category: "Lifestyle", price: 50 },
      { name: "Vintage Denim Jacket", sku: "LIF-3M4N5O", category: "Lifestyle", price: 100 },
      { name: "Retro Sneakers", sku: "LIF-6P7Q8R", category: "Lifestyle", price: 80 },
      { name: "Classic Aviator Sunglasses", sku: "LIF-9S0T1U", category: "Lifestyle", price: 90 },
      { name: "Heritage Boots", sku: "LIF-2V3W4X", category: "Lifestyle", price: 110 },
      { name: "Vintage Vinyl Record", sku: "LIF-5Y6Z7A", category: "Lifestyle", price: 20 },
      { name: "Retro Polaroid Camera", sku: "LIF-8B9C0D", category: "Lifestyle", price: 40 },
      { name: "Classic Typewriter", sku: "LIF-1E2F3G", category: "Lifestyle", price: 50 },
      { name: "Antique Brass Compass", sku: "LIF-4H5I6J", category: "Lifestyle", price: 25 }
    ]
  },
  { 
    trend: "Smart", 
    velocity: 90, 
    alignment: 80, 
    size: "large", 
    aligned: true, 
    category: "Technology",
    alignedProducts: [
      { name: "Smart Home Hub", sku: "TEC-1A2B3C", category: "Technology", price: 100 },
      { name: "Wireless Earbuds", sku: "TEC-4D5E6F", category: "Technology", price: 80 },
      { name: "Fitness Tracker", sku: "TEC-7G8H9I", category: "Technology", price: 50 },
      { name: "Portable Charger", sku: "TEC-0J1K2L", category: "Technology", price: 30 },
      { name: "Vintage Denim Jacket", sku: "TEC-3M4N5O", category: "Technology", price: 100 },
      { name: "Retro Sneakers", sku: "TEC-6P7Q8R", category: "Technology", price: 80 },
      { name: "Classic Aviator Sunglasses", sku: "TEC-9S0T1U", category: "Technology", price: 90 },
      { name: "Heritage Boots", sku: "TEC-2V3W4X", category: "Technology", price: 110 },
      { name: "Vintage Vinyl Record", sku: "TEC-5Y6Z7A", category: "Technology", price: 20 },
      { name: "Retro Polaroid Camera", sku: "TEC-8B9C0D", category: "Technology", price: 40 },
      { name: "Classic Typewriter", sku: "TEC-1E2F3G", category: "Technology", price: 50 },
      { name: "Antique Brass Compass", sku: "TEC-4H5I6J", category: "Technology", price: 25 }
    ]
  },
  { 
    trend: "Rustic", 
    velocity: 20, 
    alignment: 35, 
    size: "small", 
    aligned: false, 
    category: "Natural",
    alignedProducts: [
      { name: "Vintage Denim Jacket", sku: "NAT-1A2B3C", category: "Natural", price: 100 },
      { name: "Retro Sneakers", sku: "NAT-4D5E6F", category: "Natural", price: 80 },
      { name: "Classic Aviator Sunglasses", sku: "NAT-7G8H9I", category: "Natural", price: 90 },
      { name: "Heritage Boots", sku: "NAT-0J1K2L", category: "Natural", price: 110 },
      { name: "Vintage Vinyl Record", sku: "NAT-3M4N5O", category: "Natural", price: 20 },
      { name: "Retro Polaroid Camera", sku: "NAT-6P7Q8R", category: "Natural", price: 40 },
      { name: "Classic Typewriter", sku: "NAT-9S0T1U", category: "Natural", price: 50 },
      { name: "Antique Brass Compass", sku: "NAT-2V3W4X", category: "Natural", price: 25 },
      { name: "Vintage Denim Jacket", sku: "NAT-5Y6Z7A", category: "Natural", price: 100 },
      { name: "Retro Sneakers", sku: "NAT-8B9C0D", category: "Natural", price: 80 }
    ]
  },
  { 
    trend: "Modern", 
    velocity: 65, 
    alignment: 70, 
    size: "large", 
    aligned: true, 
    category: "Design",
    alignedProducts: [
      { name: "Bold Geometric Rug", sku: "DES-1A2B3C", category: "Design", price: 60 },
      { name: "Statement Wall Art", sku: "DES-4D5E6F", category: "Design", price: 80 },
      { name: "Dramatic Floor Lamp", sku: "DES-7G8H9I", category: "Design", price: 120 },
      { name: "Vibrant Throw Pillows", sku: "DES-0J1K2L", category: "Design", price: 35 },
      { name: "Relaxed Fit Shirt", sku: "DES-3M4N5O", category: "Design", price: 28 },
      { name: "Easy Slip-On Shoes", sku: "DES-6P7Q8R", category: "Design", price: 50 },
      { name: "Classic Aviator Sunglasses", sku: "DES-9S0T1U", category: "Design", price: 90 },
      { name: "Heritage Boots", sku: "DES-2V3W4X", category: "Design", price: 110 }
    ]
  },
]

const sizeMap: Record<"large" | "medium" | "small", string> = {
  large: "w-24 h-24",
  medium: "w-20 h-20",
  small: "w-14 h-14",
}

const TrendAlignmentBubbleMap: React.FC<BubbleMapProps> = ({
  data = defaultBubbleMapData,
  width = 800,
  height = 600,
  showZoomControls = true,
  showLegend = true,
  onBubbleClick
}) => {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hoveredBubble, setHoveredBubble] = useState<TrendData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [expandedProducts, setExpandedProducts] = useState(false)
  const [staticTooltip, setStaticTooltip] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Calculate bubble positions based on velocity and alignment
  const positionedData = useMemo(() => {
    const maxVelocity = Math.max(...data.map(d => d.velocity))
    const maxAlignment = Math.max(...data.map(d => d.alignment))
    
    return data.map((item, index) => {
      const x = (item.velocity / maxVelocity) * 100
      const y = 100 - (item.alignment / maxAlignment) * 100 // Invert Y axis
      
      return {
        ...item,
        x: `${x}%`,
        y: `${y}%`,
        originalX: x,
        originalY: y
      }
    })
  }, [data])

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, 0.5))
  }, [])

  const handleReset = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }, [pan])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.5, Math.min(3, prev * delta)))
  }, [])

  // Tooltip logic
  const handleBubbleMouseEnter = useCallback((item: TrendData, e: React.MouseEvent) => {
    if (staticTooltip) return
    setHoveredBubble(item)
    setTooltipPosition({ x: e.clientX, y: e.clientY })
    setExpandedProducts(false)
  }, [staticTooltip])

  const handleBubbleMouseMove = useCallback((e: React.MouseEvent) => {
    if (staticTooltip) return
    setTooltipPosition({ x: e.clientX, y: e.clientY })
  }, [staticTooltip])

  const handleBubbleMouseLeave = useCallback(() => {
    if (staticTooltip) return
    setHoveredBubble(null)
    setExpandedProducts(false)
  }, [staticTooltip])

  const handleBubbleClick = useCallback((item: TrendData, e: React.MouseEvent) => {
    e.stopPropagation()
    setStaticTooltip(true)
    setTooltipPosition({ x: e.clientX, y: e.clientY })
    setHoveredBubble(item)
  }, [])

  // Prevent closing when clicking inside tooltip
  const handleTooltipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  }

  // Close tooltip when clicking outside
  React.useEffect(() => {
    if (!staticTooltip) return;
    const handleClick = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        e.target instanceof Node &&
        tooltipRef.current.contains(e.target)
      ) {
        // Clicked inside the tooltip, do nothing
        return;
      }
      setStaticTooltip(false);
      setHoveredBubble(null);
      setExpandedProducts(false);
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [staticTooltip]);

  const handleShowAll = () => setExpandedProducts(true)
  const handleShowLess = () => setExpandedProducts(false)

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden">
      {/* Zoom Controls */}
      {showZoomControls && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Zoom In"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Zoom Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={handleReset}
            className="w-8 h-8 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Reset View"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      )}

      {/* Zoom Level Indicator */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Chart Container */}
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Grid Lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[0, 25, 50, 75, 100].map(percent => (
            <React.Fragment key={percent}>
              <div 
                className="absolute w-full border-t border-gray-200 opacity-30"
                style={{ top: `${percent}%` }}
              />
              <div 
                className="absolute h-full border-l border-gray-200 opacity-30"
                style={{ left: `${percent}%` }}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Axes Labels */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-sm font-medium text-gray-600 pointer-events-none select-none">
          Trend Velocity →
        </div>
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-medium text-gray-600 pointer-events-none select-none">
          ← Market Alignment
        </div>

        {/* Bubbles */}
        <div className="relative w-full h-full">
          {positionedData.map((item, index) => {
            const size = sizeMap[item.size]
            const color = item.aligned ? "bg-green-400 border-green-500" : "bg-red-400 border-red-500"
            return (
              <div
                key={index}
                className={`absolute ${size} ${color} rounded-full border-2 flex items-center justify-center shadow-lg opacity-80 hover:opacity-100 transition-all duration-200 cursor-pointer hover:scale-110`}
                style={{ 
                  left: item.x, 
                  top: item.y,
                  transform: 'translate(-50%, -50%)'
                }}
                onClick={(e) => handleBubbleClick(item, e)}
                onMouseEnter={(e) => handleBubbleMouseEnter(item, e)}
                onMouseMove={handleBubbleMouseMove}
                onMouseLeave={handleBubbleMouseLeave}
              >
                <span className="text-sm font-medium text-white text-center px-1 leading-tight">
                  {item.trend}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Product Tooltip */}
      {hoveredBubble && hoveredBubble.alignedProducts && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm max-h-96 overflow-y-auto"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-50%)'
          }}
          onClick={handleTooltipClick}
          onMouseLeave={() => {
            if (!staticTooltip) {
              setHoveredBubble(null)
              setExpandedProducts(false)
            }
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-3 h-3 rounded-full ${hoveredBubble.aligned ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <h3 className="font-semibold text-gray-800">{hoveredBubble.trend} Trend</h3>
          </div>
          
          <div className="text-xs text-gray-600 mb-2">
            {hoveredBubble.alignedProducts.length} aligned products
          </div>
          
          <div className="space-y-2">
            {(expandedProducts ? hoveredBubble.alignedProducts : hoveredBubble.alignedProducts.slice(0, 5)).map((product, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-gray-700 font-medium">{product.name}</span>
                <span className="text-gray-500 text-xs">({product.sku})</span>
              </div>
            ))}
            {hoveredBubble.alignedProducts.length > 5 && staticTooltip && !expandedProducts && (
              <button
                className="mt-2 text-xs text-blue-600 underline"
                onClick={() => setExpandedProducts(true)}
              >
                Show all
              </button>
            )}
            {hoveredBubble.alignedProducts.length > 5 && staticTooltip && expandedProducts && (
              <button
                className="mt-2 text-xs text-blue-600 underline"
                onClick={() => setExpandedProducts(false)}
              >
                Show less
              </button>
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
            <div>Velocity: {hoveredBubble.velocity}%</div>
            <div>Alignment: {hoveredBubble.alignment}%</div>
            <div>Category: {hoveredBubble.category}</div>
          </div>
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Aligned</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Not Aligned</span>
          </div>
          <div className="text-xs text-gray-500 border-t pt-2">
            <div>Size: Velocity</div>
            <div>Position: Alignment</div>
            <div>Hover: View Products</div>
            <div>Click: Pin Tooltip</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200 opacity-75 hover:opacity-100 transition-opacity">
        <div className="text-xs text-gray-600">
          <div>🖱️ Drag to pan</div>
          <div>🔍 Scroll to zoom</div>
          <div>Hover for products</div>
          <div>Click bubble to pin/expand</div>
        </div>
      </div>
    </div>
  )
}

export default TrendAlignmentBubbleMap 