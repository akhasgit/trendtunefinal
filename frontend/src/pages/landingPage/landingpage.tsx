"use client"

import type React from "react"
import { useState, type DragEvent, type ChangeEvent } from "react"
import { Link } from "react-router-dom"
import {
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ChartPieIcon,
  BoltIcon,
  StarIcon,
  ArrowRightIcon,
  PlayIcon,
  ShieldCheckIcon,
  ClockIcon,
  GlobeAltIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid"

interface DemoUploadProps {
  onComplete: () => void
}

const csvSplit = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/

const DemoUpload: React.FC<DemoUploadProps> = ({ onComplete }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [processing, setProcessing] = useState(false)

  const parseCsv = (txt: string) => {
    const lines = txt.split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) return
    const parsed = lines.map((l) => l.split(csvSplit).map((c) => c.trim().replace(/^"|"$/g, "")))
    setCsvHeaders(parsed[0])
    setRawRows(parsed.slice(1))
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFileName(f.name)
      f.text().then(parseCsv)
    }
  }

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) {
      setFileName(f.name)
      f.text().then(parseCsv)
    }
  }

  const handleAnalyze = async () => {
    setProcessing(true)
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 3000))
    setProcessing(false)
    onComplete()
  }

  if (processing) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border-0 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <ArrowPathIcon className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Analyzing Your Products</h3>
          <p className="text-gray-600">Our AI is processing your catalog and identifying trend opportunities...</p>
        </div>
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border-0 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Try It Now - Upload Your CSV</h3>
          <p className="text-gray-600">See how TrendTune analyzes your products in real-time</p>
        </div>
      </div>

      <div className="p-6">
        {!csvHeaders.length ? (
          <div
            className={`relative border-2 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
              isDragging
                ? "border-blue-400 bg-blue-50 scale-105"
                : "border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("demo-csv-input")?.click()}
          >
            <div className="text-center space-y-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <DocumentIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{fileName ? `Ready: ${fileName}` : "Drop your CSV here"}</p>
                <p className="text-sm text-gray-500">or click to browse</p>
              </div>
            </div>
            <input id="demo-csv-input" type="file" accept=".csv" className="hidden" onChange={handleSelect} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">File Ready for Analysis</h4>
                <p className="text-sm text-gray-500">{rawRows.length} products detected</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                ✓ {fileName}
              </span>
            </div>
            <button
              onClick={handleAnalyze}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <BoltIcon className="w-5 h-5" />
              Analyze My Products
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const DemoResults: React.FC = () => {
  const SkeletonRow = ({ cols }: { cols: number }) => (
    <tr className="opacity-40">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )

  return (
    <div className="space-y-8">
      {/* Results Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete!</h3>
          <p className="text-gray-600">Here's what we discovered about your product catalog</p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircleIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-blue-900">1</div>
          <div className="text-sm text-blue-700">Products Aligned</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <XCircleIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-orange-900">1</div>
          <div className="text-sm text-orange-700">Need Optimization</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <LightBulbIcon className="w-6 h-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-purple-900">3</div>
          <div className="text-sm text-purple-700">New Opportunities</div>
        </div>
      </div>

      {/* Sample Results Table */}
      <div className="bg-white rounded-xl shadow-lg border-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="font-semibold text-gray-900">Product Analysis Preview</h4>
          <p className="text-sm text-gray-500">Sample results from your catalog analysis</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Trend Match</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Velvet Blouse</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Soft Luxe</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">✓ Aligned</span>
                </td>
                <td className="px-4 py-3 text-gray-400">—</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Pom Pom Hat</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Hand Balloons</span>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">✗ Needs Fix</span>
                </td>
                <td className="px-4 py-3">
                  <button className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700">
                    Optimize
                  </button>
                </td>
              </tr>
              <SkeletonRow cols={4} />
              <SkeletonRow cols={4} />
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8">
        <h4 className="text-xl font-bold text-gray-900">Want to see the complete analysis?</h4>
        <p className="text-gray-600 mb-6">
          This is just a preview. Get the full analysis with detailed recommendations, trend predictions, and more.
        </p>
        <Link
          to="/signup" // TODO: Replace with actual signup route
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105"
        >
          <BoltIcon className="w-5 h-5" />
          Sign Up Now - View All Analytics
          <ArrowRightIcon className="w-5 h-5" />
        </Link>
      </div>
    </div>
  )
}

const LandingPage: React.FC = () => {
  const [showDemo, setShowDemo] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleDemoComplete = () => {
    setShowResults(true)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                TrendTune
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">
                How It Works
              </a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">
                Pricing
              </a>
              <Link
                to="/login" // TODO: Replace with actual login route
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup" // TODO: Replace with actual signup route
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
                Turn Your Products Into
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {" "}
                  Trend Winners
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                AI-powered trend analysis that aligns your product catalog with market demands. Discover what's
                trending, optimize your listings, and boost sales with data-driven insights.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signup" // TODO: Replace with actual signup route
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
              >
                <BoltIcon className="w-5 h-5" />
                Start Free Analysis
              </Link>
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <PlayIcon className="w-5 h-5" />
                Watch Demo (2 min)
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                Free 14-day trial
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                Setup in 5 minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-500 mb-8">Trusted by 500+ e-commerce businesses</p>
            <div className="flex items-center justify-center gap-8 opacity-60">
              {/* Placeholder for company logos */}
              <div className="w-24 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">Logo</span>
              </div>
              <div className="w-24 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">Logo</span>
              </div>
              <div className="w-24 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">Logo</span>
              </div>
              <div className="w-24 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-400 text-xs">Logo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">See TrendTune in Action</h2>
            <p className="text-xl text-gray-600">
              Upload your product CSV and watch our AI analyze your catalog in real-time
            </p>
          </div>

          {!showResults ? <DemoUpload onComplete={handleDemoComplete} /> : <DemoResults />}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Win with Trends
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform gives you the insights and tools to align your products with market trends
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: ArrowTrendingUpIcon,
                title: "Real-Time Trend Analysis",
                description:
                  "Get instant insights into what's trending in your market with our AI-powered analysis engine.",
                color: "from-blue-500 to-indigo-600",
              },
              {
                icon: ChartBarIcon,
                title: "Product Alignment Scoring",
                description:
                  "See exactly how well your products align with current trends and get actionable recommendations.",
                color: "from-green-500 to-emerald-600",
              },
              {
                icon: LightBulbIcon,
                title: "Smart Recommendations",
                description:
                  "Discover new product opportunities and optimization suggestions tailored to your catalog.",
                color: "from-purple-500 to-pink-600",
              },
              {
                icon: ChartPieIcon,
                title: "Visual Analytics Dashboard",
                description:
                  "Beautiful, intuitive dashboards that make complex trend data easy to understand and act on.",
                color: "from-orange-500 to-red-600",
              },
              {
                icon: BoltIcon,
                title: "Automated Optimization",
                description: "Get AI-generated product descriptions and titles optimized for trending keywords.",
                color: "from-cyan-500 to-blue-600",
              },
              {
                icon: UserGroupIcon,
                title: "Demographic Insights",
                description: "Understand which demographics are driving trends and tailor your products accordingly.",
                color: "from-indigo-500 to-purple-600",
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6`}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How TrendTune Works</h2>
            <p className="text-xl text-gray-600">Get started in minutes with our simple 3-step process</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload Your Catalog",
                description:
                  "Simply upload your product CSV file or connect your e-commerce platform. We support all major formats.",
                icon: CloudArrowUpIcon,
              },
              {
                step: "02",
                title: "AI Analysis",
                description:
                  "Our AI analyzes your products against real-time market trends, identifying opportunities and gaps.",
                icon: BoltIcon,
              },
              {
                step: "03",
                title: "Get Insights & Act",
                description: "Receive actionable recommendations, optimize your listings, and watch your sales grow.",
                icon: ArrowTrendingUpIcon,
              },
            ].map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">{step.step}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Join hundreds of businesses already winning with TrendTune</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Sarah Chen",
                role: "E-commerce Manager",
                company: "Fashion Forward",
                content:
                  "TrendTune helped us identify trending products 3 months before our competitors. Our sales increased by 40% in just one quarter.",
                rating: 5,
              },
              {
                name: "Mike Rodriguez",
                role: "Founder",
                company: "Tech Gadgets Pro",
                content:
                  "The AI recommendations are spot-on. We've launched 5 new products based on TrendTune insights, all of them bestsellers.",
                rating: 5,
              },
              {
                name: "Emily Watson",
                role: "Product Manager",
                company: "Home & Living Co",
                content:
                  "Finally, a tool that makes trend analysis simple. The dashboard is beautiful and the insights are actionable.",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-lg">
                <div className="flex items-center mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-bold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-500 text-sm">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your business needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$29",
                period: "/month",
                description: "Perfect for small businesses getting started with trend analysis",
                features: ["Up to 100 products", "Basic trend analysis", "Email support", "Monthly reports"],
                cta: "Start Free Trial",
                popular: false,
              },
              {
                name: "Professional",
                price: "$79",
                period: "/month",
                description: "Advanced features for growing businesses",
                features: [
                  "Up to 1,000 products",
                  "Advanced AI insights",
                  "Priority support",
                  "Weekly reports",
                  "API access",
                ],
                cta: "Start Free Trial",
                popular: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                description: "Tailored solutions for large organizations",
                features: [
                  "Unlimited products",
                  "Custom integrations",
                  "Dedicated support",
                  "Daily reports",
                  "White-label options",
                ],
                cta: "Contact Sales",
                popular: false,
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl p-8 shadow-lg border-2 ${
                  plan.popular ? "border-blue-500 relative" : "border-gray-100"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <p className="text-gray-600">{plan.description}</p>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <CheckCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup" // TODO: Replace with actual signup route
                  className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 text-center block ${
                    plan.popular
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                      : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Turn Trends Into Revenue?</h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Join hundreds of businesses already using TrendTune to stay ahead of market trends and boost their sales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup" // TODO: Replace with actual signup route
                className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <BoltIcon className="w-5 h-5" />
                Start Your Free Trial
              </Link>
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200">
                Schedule Demo
              </button>
            </div>
            <div className="flex items-center justify-center gap-8 text-blue-100">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2">
                <ClockIcon className="w-5 h-5" />
                Setup in 5 minutes
              </div>
              <div className="flex items-center gap-2">
                <GlobeAltIcon className="w-5 h-5" />
                Cancel anytime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                TrendTune
              </h3>
              <p className="text-gray-400">
                AI-powered trend analysis for e-commerce businesses. Turn market insights into revenue growth.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integrations
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Status
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; Made with ❤️ by TrendTune, 2025. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
