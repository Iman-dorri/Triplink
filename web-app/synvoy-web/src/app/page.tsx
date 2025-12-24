'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import Chatbot from '@/components/Chatbot'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [activeFeature, setActiveFeature] = useState(0)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set())
  const [visibleTestimonials, setVisibleTestimonials] = useState<Set<number>>(new Set())
  const [animatedStats, setAnimatedStats] = useState({
    travelers: 0,
    trips: 0,
    saved: 0,
    satisfaction: 0
  })
  const [scrolled, setScrolled] = useState(false)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down')
  const [scrollY, setScrollY] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showChatbot, setShowChatbot] = useState(true) // Always show for now
  const [mounted, setMounted] = useState(false)
  const lastScrollY = useRef(0)
  
  const statsRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const ctaRef = useRef<HTMLDivElement>(null)
  const featureRefs = useRef<(HTMLDivElement | null)[]>([])
  const testimonialRefs = useRef<(HTMLDivElement | null)[]>([])

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Intersection Observer for scroll animations with direction awareness
  useEffect(() => {
    // Hero section is visible by default
    setVisibleSections((prev) => new Set(prev).add('hero'))

    const observerOptions = {
      threshold: [0, 0.1, 0.5, 1],
      rootMargin: '0px 0px -100px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionId = entry.target.id
        const isIntersecting = entry.isIntersecting
        const intersectionRatio = entry.intersectionRatio
        
        if (isIntersecting && intersectionRatio > 0.1) {
          // Element is entering viewport - show it
          setVisibleSections((prev) => new Set(prev).add(sectionId))
        } else if (!isIntersecting && scrollDirection === 'down') {
          // Element is leaving viewport while scrolling down - hide it smoothly
          setVisibleSections((prev) => {
            const newSet = new Set(prev)
            newSet.delete(sectionId)
            return newSet
          })
        } else if (isIntersecting && scrollDirection === 'up' && intersectionRatio > 0.1) {
          // Element is entering viewport while scrolling up - show it
          setVisibleSections((prev) => new Set(prev).add(sectionId))
        }
      })
    }, observerOptions)

    const sections = [statsRef, featuresRef, testimonialsRef, ctaRef].filter(Boolean)
    sections.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => {
      sections.forEach((ref) => {
        if (ref.current) {
          observer.unobserve(ref.current)
        }
      })
    }
  }, [scrollDirection])

  // Intersection Observer for individual feature cards with direction awareness
  useEffect(() => {
    const observerOptions = {
      threshold: [0, 0.2, 0.5, 1],
      rootMargin: '0px 0px -50px 0px'
    }

    const featureObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-feature-index') || '0')
        const isIntersecting = entry.isIntersecting
        const intersectionRatio = entry.intersectionRatio
        
        if (isIntersecting && intersectionRatio > 0.2) {
          // Card is entering viewport - show it
          setVisibleFeatures((prev) => new Set(prev).add(index))
        } else if (!isIntersecting && scrollDirection === 'down') {
          // Card is leaving viewport while scrolling down - hide it smoothly
          setVisibleFeatures((prev) => {
            const newSet = new Set(prev)
            newSet.delete(index)
            return newSet
          })
        } else if (isIntersecting && scrollDirection === 'up' && intersectionRatio > 0.2) {
          // Card is entering viewport while scrolling up - show it
          setVisibleFeatures((prev) => new Set(prev).add(index))
        }
      })
    }, observerOptions)

    // Observe all feature refs
    featureRefs.current.forEach((ref) => {
      if (ref) {
        featureObserver.observe(ref)
      }
    })

    return () => {
      featureRefs.current.forEach((ref) => {
        if (ref) {
          featureObserver.unobserve(ref)
        }
      })
    }
  }, [scrollDirection])

  // Intersection Observer for individual testimonial cards with direction awareness
  useEffect(() => {
    const observerOptions = {
      threshold: [0, 0.2, 0.5, 1],
      rootMargin: '0px 0px -50px 0px'
    }

    const testimonialObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-testimonial-index') || '0')
        const isIntersecting = entry.isIntersecting
        const intersectionRatio = entry.intersectionRatio
        
        if (isIntersecting && intersectionRatio > 0.2) {
          // Card is entering viewport - show it
          setVisibleTestimonials((prev) => new Set(prev).add(index))
        } else if (!isIntersecting && scrollDirection === 'down') {
          // Card is leaving viewport while scrolling down - hide it smoothly
          setVisibleTestimonials((prev) => {
            const newSet = new Set(prev)
            newSet.delete(index)
            return newSet
          })
        } else if (isIntersecting && scrollDirection === 'up' && intersectionRatio > 0.2) {
          // Card is entering viewport while scrolling up - show it
          setVisibleTestimonials((prev) => new Set(prev).add(index))
        }
      })
    }, observerOptions)

    // Observe all testimonial refs
    testimonialRefs.current.forEach((ref) => {
      if (ref) {
        testimonialObserver.observe(ref)
      }
    })

    return () => {
      testimonialRefs.current.forEach((ref) => {
        if (ref) {
          testimonialObserver.unobserve(ref)
        }
      })
    }
  }, [scrollDirection])

  // Animate stats counter
  useEffect(() => {
    if (!visibleSections.has('stats')) return

    const duration = 2000 // 2 seconds
    const steps = 60
    const stepDuration = duration / steps

    const animateValue = (
      start: number,
      end: number,
      callback: (value: number) => void
    ) => {
      const increment = (end - start) / steps
      let current = start
      let step = 0

      const timer = setInterval(() => {
        step++
        current += increment
        if (step >= steps) {
          current = end
          clearInterval(timer)
        }
        callback(Math.floor(current))
      }, stepDuration)
    }

    animateValue(0, 50000, (val) => setAnimatedStats((prev) => ({ ...prev, travelers: val })))
    animateValue(0, 200000, (val) => setAnimatedStats((prev) => ({ ...prev, trips: val })))
    animateValue(0, 5000000, (val) => setAnimatedStats((prev) => ({ ...prev, saved: val })))
    animateValue(0, 98, (val) => setAnimatedStats((prev) => ({ ...prev, satisfaction: val })))
  }, [visibleSections])

  // Smooth scroll behavior
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  // Show chatbot after user scrolls a bit (better UX)
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowChatbot(true)
      } else {
        setShowChatbot(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Scroll effect for navigation and scroll direction detection
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Update navigation background
      setScrolled(currentScrollY > 50)
      
      // Update scroll position for parallax
      setScrollY(currentScrollY)
      
      // Detect scroll direction
      if (currentScrollY > lastScrollY.current) {
        setScrollDirection('down')
      } else if (currentScrollY < lastScrollY.current) {
        setScrollDirection('up')
      }
      
      // Close mobile menu on scroll (with debounce to prevent immediate closing)
      if (mobileMenuOpen) {
        clearTimeout(scrollTimeout)
        scrollTimeout = setTimeout(() => {
          // Only close if scroll is significant (more than 10px)
          if (Math.abs(currentScrollY - lastScrollY.current) > 10) {
            setMobileMenuOpen(false)
          }
        }, 100)
      }
      
      lastScrollY.current = currentScrollY
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [mobileMenuOpen])


  const features = [
    {
      icon: '✈️',
      title: 'Smart Trip Planning',
      description: 'Create detailed itineraries with AI-powered suggestions and real-time updates.',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    {
      icon: '💰',
      title: 'Price Tracking',
      description: 'Monitor flight and hotel prices with intelligent alerts for the best deals.',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50'
    },
    {
      icon: '🛍️',
      title: 'Travel Shopping',
      description: 'Manage your travel shopping list and track prices across multiple platforms.',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50'
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      description: 'Get timely alerts for price drops, booking reminders, and travel updates.',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-br from-orange-50 to-red-50'
    },
    {
      icon: '👥',
      title: 'Social Travel',
      description: 'Connect with friends, share itineraries, and plan group trips together.',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50'
    },
    {
      icon: '📱',
      title: 'Cross-Platform',
      description: 'Access your trips from web, mobile, and tablet devices seamlessly.',
      color: 'from-gray-600 to-gray-800',
      bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100'
    }
  ]

  const stats = [
    { value: '50K+', label: 'Happy Travelers', icon: '👥', color: 'text-blue-600' },
    { value: '200K+', label: 'Trips Planned', icon: '✈️', color: 'text-emerald-600' },
    { value: '$5M+', label: 'Money Saved', icon: '💰', color: 'text-purple-600' },
    { value: '98%', label: 'Satisfaction Rate', icon: '⭐', color: 'text-orange-600' }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Frequent Traveler',
      avatar: '👩‍💼',
      content: 'Synvoy saved me over $800 on my last vacation. The price alerts are incredible!',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Business Traveler',
      avatar: '👨‍💻',
      content: 'The trip planning features are amazing. I can organize everything in one place.',
      rating: 5
    },
    {
      name: 'Emma Rodriguez',
      role: 'Adventure Seeker',
      avatar: '🧗‍♀️',
      content: 'Love how I can track my shopping list and get notified of the best deals.',
      rating: 5
    }
  ]

  // Navigation content - extracted to render via portal
  const navigationContent = (
    <nav className={`bg-white/90 backdrop-blur-xl border-b border-white/20 fixed top-0 left-0 right-0 z-[99998] shadow-lg shadow-blue-900/5 transition-all duration-300 w-full ${
      scrolled ? 'bg-white/95 shadow-xl' : ''
    }`} style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0,
      right: 0,
      zIndex: 99998, 
      width: '100%'
    }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
                <p className="text-[10px] sm:text-xs text-gray-500 -mt-0.5 sm:-mt-1 hidden sm:block">Smart Travel Platform</p>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <a href="#features" className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors font-medium">Pricing</a>
              <Link href="/about" className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors font-medium">About</Link>
              <Link href="/contact" className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors font-medium">Contact</Link>
            </div>
            
            {/* Desktop Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/signin"
                className="px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base border-2 border-blue-600 text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link 
                href="/register"
                className="px-4 lg:px-8 py-2 lg:py-3 text-sm lg:text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                Get Started Free
              </Link>
            </div>

            {/* Mobile Hamburger Button */}
              <button 
              onClick={(e) => {
                e.stopPropagation()
                setMobileMenuOpen(!mobileMenuOpen)
              }}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200 relative z-[101]"
              aria-label="Toggle menu"
              type="button"
            >
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${mobileMenuOpen ? 'rotate-90' : ''}`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
              </button>
          </div>

          {/* Mobile Menu */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out relative z-[100] bg-white ${
              mobileMenuOpen ? 'max-h-96 opacity-100 visible' : 'max-h-0 opacity-0 invisible'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-4 space-y-3 border-t border-gray-200 mt-2">
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault()
                  setMobileMenuOpen(false)
                  setTimeout(() => {
                    const element = document.getElementById('features')
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
                className="block px-4 py-2 text-base text-gray-700 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault()
                  setMobileMenuOpen(false)
                  setTimeout(() => {
                    const element = document.getElementById('pricing')
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }, 100)
                }}
                className="block px-4 py-2 text-base text-gray-700 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors font-medium"
              >
                Pricing
              </a>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault()
                  setMobileMenuOpen(false)
                  router.push('/about')
                }}
                className="block px-4 py-2 text-base text-gray-700 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors font-medium"
              >
                About
              </a>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-base text-gray-700 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg transition-colors font-medium"
              >
                Contact
              </Link>
              <div className="pt-2 space-y-2 border-t border-gray-200">
                <Link
                  href="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-2.5 text-base border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all duration-300 font-semibold shadow-lg text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full px-4 py-2.5 text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg text-center"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>
  )

  return (
    <>
    {/* Navigation - Rendered via portal to avoid PageTransition transform issues */}
    {mounted && typeof document !== 'undefined' && createPortal(navigationContent, document.body)}

    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 animate-fadeIn relative flex flex-col overflow-x-hidden pt-16 sm:pt-20">
      {/* Hero Section */}
      <section 
        ref={heroRef}
        id="hero"
        className={`relative overflow-hidden pt-4 sm:pt-8 lg:pt-12 pb-12 sm:pb-16 lg:pb-20 transition-all duration-1000 ${
          visibleSections.has('hero') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center relative z-10">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 shadow-lg">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mr-1.5 sm:mr-2 animate-pulse"></span>
              <span className="hidden sm:inline">Join 50,000+ travelers already using Synvoy</span>
              <span className="sm:hidden">50,000+ travelers</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight">
              Your Smart Travel
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mt-1 sm:mt-2">
                Companion
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Plan trips, track prices, and manage your travel shopping all in one beautiful platform. 
              Get the best deals and create unforgettable memories with AI-powered insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Link 
                href="/register"
                className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xl rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 flex items-center space-x-3"
              >
                <span>Start Planning Free</span>
                <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
              </Link>
              <button 
                className="px-10 py-5 border-2 border-gray-300 text-gray-700 text-xl rounded-2xl hover:border-blue-600 hover:text-blue-600 transition-all duration-300 font-semibold bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center space-x-3"
              >
                <span>🎬</span>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-12 text-gray-500">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Background Elements with Parallax */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div 
            className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-30 blur-3xl animate-pulse float transition-transform duration-300 ease-out"
            style={{ 
              transform: `translateY(${scrollDirection === 'down' ? scrollY * 0.1 : scrollY * 0.05}px)`
            }}
          ></div>
          <div 
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full opacity-30 blur-3xl animate-pulse animation-delay-1000 float transition-transform duration-300"
            style={{ 
              animationDelay: '1s',
              transform: `translateY(${scrollDirection === 'down' ? -scrollY * 0.15 : -scrollY * 0.08}px)`
            }}
          ></div>
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl animate-pulse animation-delay-2000 float transition-transform duration-300"
            style={{ 
              animationDelay: '2s',
              transform: `translate(-50%, calc(-50% + ${scrollDirection === 'down' ? scrollY * 0.08 : scrollY * 0.04}px))`
            }}
          ></div>
        </div>
      </section>

      {/* Stats Section */}
      <section 
        ref={statsRef}
        id="stats"
        className={`py-20 bg-white/80 backdrop-blur-sm transition-all duration-1000 ${
          visibleSections.has('stats') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              let displayValue = stat.value
              if (visibleSections.has('stats')) {
                if (stat.label === 'Happy Travelers') {
                  displayValue = `${(animatedStats.travelers / 1000).toFixed(0)}K+`
                } else if (stat.label === 'Trips Planned') {
                  displayValue = `${(animatedStats.trips / 1000).toFixed(0)}K+`
                } else if (stat.label === 'Money Saved') {
                  displayValue = `$${(animatedStats.saved / 1000000).toFixed(1)}M+`
                } else if (stat.label === 'Satisfaction Rate') {
                  displayValue = `${animatedStats.satisfaction}%`
                }
              }
              
              return (
              <div
                key={stat.label}
                  className={`text-center group cursor-pointer transform hover:scale-105 transition-all duration-300 ${
                    visibleSections.has('stats') 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-10'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className={`text-5xl mb-3 ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div className={`text-4xl font-bold ${stat.color} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                    {displayValue}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={featuresRef}
        id="features" 
        className={`py-24 bg-gradient-to-br from-gray-50 to-blue-50 transition-all duration-1000 ${
          visibleSections.has('features') ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 transition-all duration-1000 ${
            visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Everything You Need for
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Perfect Travel
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              From planning to booking, from alerts to shopping - we've got you covered with 
              cutting-edge technology and intuitive design.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                ref={(el) => {
                  featureRefs.current[index] = el
                }}
                data-feature-index={index}
                className={`group cursor-pointer transform hover:scale-105 transition-all duration-700 ${feature.bgColor} rounded-3xl p-8 border border-white/50 shadow-xl hover:shadow-2xl backdrop-blur-sm ${
                  visibleFeatures.has(index)
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-10 scale-95'
                }`}
                style={{ 
                  transitionDelay: visibleFeatures.has(index) ? `${index * 150}ms` : '0ms'
                }}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`text-6xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {feature.description}
                </p>
                <div className="mt-6 flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                  <span>Learn more</span>
                  <span className="ml-2">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section 
        ref={testimonialsRef}
        id="testimonials"
        className={`py-24 bg-white transition-all duration-1000 ${
          visibleSections.has('testimonials') ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-20 transition-all duration-1000 ${
            visibleSections.has('testimonials') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Loved by Travelers
              <span className="block text-blue-600">Worldwide</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what our users are saying about their Synvoy experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.name}
                ref={(el) => {
                  testimonialRefs.current[index] = el
                }}
                data-testimonial-index={index}
                className={`bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-700 transform hover:-translate-y-2 ${
                  visibleTestimonials.has(index)
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-10 scale-95'
                }`}
                style={{ 
                  transitionDelay: visibleTestimonials.has(index) ? `${index * 150}ms` : '0ms'
                }}
              >
                <div className="flex items-center mb-6">
                  <div className="text-4xl mr-4">{testimonial.avatar}</div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed mb-6 text-lg">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-xl">⭐</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaRef}
        id="cta"
        className={`py-24 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 relative overflow-hidden transition-all duration-1000 ${
          visibleSections.has('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Transform Your
            <span className="block">Travel Experience?</span>
          </h2>
          <p className="text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Join thousands of travelers who are already saving money and planning better trips. 
            Start your journey today with our free plan.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link 
              href="/register"
              className="px-12 py-5 bg-white text-blue-600 text-xl rounded-2xl hover:bg-gray-50 transition-all duration-300 font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-2"
            >
              Get Started Free
              <span className="ml-3">🚀</span>
            </Link>
            <button className="px-12 py-5 border-2 border-white/30 text-white text-xl rounded-2xl hover:bg-white/10 transition-all duration-300 font-semibold backdrop-blur-sm">
              View Pricing
            </button>
          </div>
          <p className="text-blue-200 mt-6 text-sm">
            No credit card required • Free forever plan • Cancel anytime
          </p>
        </div>
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-20 w-full mb-0 pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mr-4">
                  <span className="text-2xl">🌍</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">Synvoy</span>
                  <p className="text-sm text-gray-400">Smart Travel Platform</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed mb-6">
                Your smart travel companion for planning, booking, and shopping. 
                Making travel easier, cheaper, and more enjoyable.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors duration-300">
                  <span className="text-lg">📘</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors duration-300">
                  <span className="text-lg">🐦</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors duration-300">
                  <span className="text-lg">📷</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors duration-300">
                  <span className="text-lg">💼</span>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Product</h3>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Trip Planning</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Price Alerts</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Travel Shopping</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Mobile App</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">API Access</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Company</h3>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">About Us</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Press</a></li>
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold mb-6 text-white">Support</h3>
              <ul className="space-y-4">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Community</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Status Page</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              &copy; 2024 Synvoy. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors duration-300">Privacy</a>
              <a href="#" className="hover:text-white transition-colors duration-300">Terms</a>
              <a href="#" className="hover:text-white transition-colors duration-300">Cookies</a>
              <a href="#" className="hover:text-white transition-colors duration-300">Settings</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
    
    {/* Chatbot - Fixed at viewport, always visible */}
    <Chatbot />
    </>
  )
}
