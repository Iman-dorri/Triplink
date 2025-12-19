'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AboutPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set())
  const [visibleValues, setVisibleValues] = useState<Set<number>>(new Set())
  const [scrolled, setScrolled] = useState(false)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down')
  const [scrollY, setScrollY] = useState(0)
  const lastScrollY = useRef(0)
  
  const heroRef = useRef<HTMLDivElement>(null)
  const missionRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef<HTMLDivElement>(null)
  const teamRef = useRef<HTMLDivElement>(null)
  const featureRefs = useRef<(HTMLDivElement | null)[]>([])
  const valueRefs = useRef<(HTMLDivElement | null)[]>([])
  const whyChooseRefs = useRef<(HTMLDivElement | null)[]>([])
  const [visibleWhyChoose, setVisibleWhyChoose] = useState<Set<number>>(new Set())

  // Ensure page starts at top and handle scroll restoration
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0)
    
    // Disable browser scroll restoration
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
    
    // Set smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth'
    
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
      // Re-enable scroll restoration on unmount
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto'
      }
    }
  }, [])

  // Scroll effect for navigation and scroll direction detection
  useEffect(() => {
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
      
      lastScrollY.current = currentScrollY
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

    const sections = [missionRef, featuresRef, valuesRef, teamRef].filter(Boolean)
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

  // Intersection Observer for individual value cards with direction awareness
  useEffect(() => {
    const observerOptions = {
      threshold: [0, 0.2, 0.5, 1],
      rootMargin: '0px 0px -50px 0px'
    }

    const valueObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-value-index') || '0')
        const isIntersecting = entry.isIntersecting
        const intersectionRatio = entry.intersectionRatio
        
        if (isIntersecting && intersectionRatio > 0.2) {
          // Card is entering viewport - show it
          setVisibleValues((prev) => new Set(prev).add(index))
        } else if (!isIntersecting && scrollDirection === 'down') {
          // Card is leaving viewport while scrolling down - hide it smoothly
          setVisibleValues((prev) => {
            const newSet = new Set(prev)
            newSet.delete(index)
            return newSet
          })
        } else if (isIntersecting && scrollDirection === 'up' && intersectionRatio > 0.2) {
          // Card is entering viewport while scrolling up - show it
          setVisibleValues((prev) => new Set(prev).add(index))
        }
      })
    }, observerOptions)

    // Observe all value refs
    valueRefs.current.forEach((ref) => {
      if (ref) {
        valueObserver.observe(ref)
      }
    })

    return () => {
      valueRefs.current.forEach((ref) => {
        if (ref) {
          valueObserver.unobserve(ref)
        }
      })
    }
  }, [scrollDirection])

  // Intersection Observer for individual "Why Choose" cards with direction awareness
  useEffect(() => {
    const observerOptions = {
      threshold: [0, 0.2, 0.5, 1],
      rootMargin: '0px 0px -50px 0px'
    }

    const whyChooseObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const index = parseInt(entry.target.getAttribute('data-why-choose-index') || '0')
        const isIntersecting = entry.isIntersecting
        const intersectionRatio = entry.intersectionRatio
        
        if (isIntersecting && intersectionRatio > 0.2) {
          // Card is entering viewport - show it
          setVisibleWhyChoose((prev) => new Set(prev).add(index))
        } else if (!isIntersecting && scrollDirection === 'down') {
          // Card is leaving viewport while scrolling down - hide it smoothly
          setVisibleWhyChoose((prev) => {
            const newSet = new Set(prev)
            newSet.delete(index)
            return newSet
          })
        } else if (isIntersecting && scrollDirection === 'up' && intersectionRatio > 0.2) {
          // Card is entering viewport while scrolling up - show it
          setVisibleWhyChoose((prev) => new Set(prev).add(index))
        }
      })
    }, observerOptions)

    // Observe all why choose refs
    whyChooseRefs.current.forEach((ref) => {
      if (ref) {
        whyChooseObserver.observe(ref)
      }
    })

    return () => {
      whyChooseRefs.current.forEach((ref) => {
        if (ref) {
          whyChooseObserver.unobserve(ref)
        }
      })
    }
  }, [scrollDirection])

  const features = [
    {
      icon: '✈️',
      title: 'Smart Travel Planning',
      description: 'Create detailed itineraries with multiple destinations, manage budgets, and track expenses. Get AI-powered suggestions and real-time updates for your perfect trip.',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-gradient-to-br from-blue-50 to-cyan-50'
    },
    {
      icon: '💰',
      title: 'Intelligent Price Monitoring',
      description: 'Monitor flight and hotel prices with intelligent alerts. Get notified when prices drop within your budget range, helping you save money on every trip.',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-50'
    },
    {
      icon: '🛍️',
      title: 'Smart Shopping Assistant',
      description: 'Track prices for travel-related items across multiple platforms. Get alerts when items fall within your budget and make informed purchasing decisions.',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-gradient-to-br from-purple-50 to-pink-50'
    },
    {
      icon: '👥',
      title: 'Social Connectivity',
      description: 'Connect with friends, family, and travel companions. Plan trips collaboratively, share experiences, and build meaningful connections through travel.',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-gradient-to-br from-indigo-50 to-blue-50'
    },
    {
      icon: '🤖',
      title: 'AI-Powered Assistant',
      description: 'Get personalized recommendations based on your preferences. Receive travel advice, destination insights, and shopping guidance powered by advanced AI.',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-gradient-to-br from-orange-50 to-red-50'
    },
    {
      icon: '📱',
      title: 'Cross-Platform Access',
      description: 'Seamlessly access your trips and shopping lists from web, mobile, and tablet devices. Your data syncs across all platforms in real-time.',
      color: 'from-gray-600 to-gray-800',
      bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100'
    }
  ]

  const values = [
    {
      icon: '🎯',
      title: 'User-Centric',
      description: 'Everything we build is designed with our users in mind. Your needs, preferences, and feedback drive our development.'
    },
    {
      icon: '🔒',
      title: 'Privacy First',
      description: 'Your data is yours. We prioritize security and privacy, ensuring your personal information is always protected.'
    },
    {
      icon: '🌍',
      title: 'Global Reach',
      description: 'Connecting travelers and shoppers worldwide, breaking down barriers and building a global community.'
    },
    {
      icon: '💡',
      title: 'Innovation',
      description: 'Constantly evolving with cutting-edge technology to provide the best possible experience for our users.'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-x-hidden animate-fadeIn">
      {/* Navigation */}
      <nav className={`bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5 transition-all duration-300 w-full ${
        scrolled ? 'bg-white/95 shadow-xl' : ''
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
                <p className="text-[10px] sm:text-xs text-gray-500 -mt-0.5 sm:-mt-1 hidden sm:block">Smart Travel Platform</p>
              </div>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/"
                className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-xs sm:text-sm lg:text-base border-2 border-blue-600 text-blue-600 rounded-lg sm:rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
              >
                {user ? 'Dashboard' : 'Home'}
              </Link>
              {!user && (
                <Link
                  href="/"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push('/')
                  }}
                  className="px-3 sm:px-4 lg:px-8 py-2 sm:py-3 text-xs sm:text-sm lg:text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  <span className="hidden sm:inline">Get Started Free</span>
                  <span className="sm:hidden">Get Started</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        id="hero"
        className={`relative overflow-hidden pt-20 sm:pt-24 lg:pt-32 pb-12 sm:pb-16 lg:pb-20 transition-all duration-700 ease-out ${
          visibleSections.has('hero') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center relative z-10">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-100 text-blue-800 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 shadow-lg">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-600 rounded-full mr-1.5 sm:mr-2 animate-pulse"></span>
              <span>About Synvoy</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 sm:mb-8 leading-tight">
              Your Smart Travel
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mt-1 sm:mt-2">
                Companion
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed">
              Synvoy is a comprehensive smart platform that combines travel planning, price monitoring, and social connectivity. 
              We empower you to make smarter travel and shopping decisions while building meaningful connections.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm sm:text-base text-gray-600">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🌍</span>
                <span>Global Community</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">💡</span>
                <span>AI-Powered</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔒</span>
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Background Elements with Parallax */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div 
            className="absolute -top-40 -right-40 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-30 blur-3xl animate-pulse float transition-transform duration-300 ease-out"
            style={{ 
              transform: `translateY(${scrollDirection === 'down' ? scrollY * 0.1 : scrollY * 0.05}px)`
            }}
          ></div>
          <div 
            className="absolute -bottom-40 -left-40 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full opacity-30 blur-3xl animate-pulse animation-delay-1000 float transition-transform duration-300"
            style={{ 
              animationDelay: '1s',
              transform: `translateY(${scrollDirection === 'down' ? -scrollY * 0.15 : -scrollY * 0.08}px)`
            }}
          ></div>
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl animate-pulse animation-delay-2000 float transition-transform duration-300"
            style={{ 
              animationDelay: '2s',
              transform: `translate(-50%, calc(-50% + ${scrollDirection === 'down' ? scrollY * 0.08 : scrollY * 0.04}px))`
            }}
          ></div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section 
        ref={missionRef}
        id="mission"
        className={`w-full py-20 sm:py-24 lg:py-32 bg-white transition-all duration-700 ease-out ${
          visibleSections.has('mission') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16">
            {/* Mission */}
            <div 
              className={`transition-all ease-in-out overflow-hidden ${
                visibleSections.has('mission') ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10 sm:-translate-x-20'
              }`}
              style={{ 
                transitionDuration: '1500ms',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl">
                <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🎯</div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Our Mission
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
                  Empower users to make smarter travel and shopping decisions by providing real-time price monitoring, 
                  collaborative planning tools, and AI-driven recommendations, all while building meaningful social connections.
                </p>
              </div>
            </div>

            {/* Vision */}
            <div 
              className={`transition-all ease-in-out overflow-hidden ${
                visibleSections.has('mission') ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 sm:translate-x-20'
              }`}
              style={{ 
                transitionDuration: '1500ms',
                transitionDelay: '400ms',
                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xl">
                <div className="text-5xl sm:text-6xl mb-4 sm:mb-6">🌟</div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                  Our Vision
                </h2>
                <p className="text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed">
                  To become the ultimate smart companion for travelers and shoppers, connecting people through shared interests 
                  while optimizing their spending through intelligent price monitoring and AI assistance.
                </p>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div className={`mt-12 sm:mt-16 text-center transition-all duration-700 ease-out ${
            visibleSections.has('mission') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`} style={{ transitionDelay: '400ms' }}>
            <div className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-2xl shadow-2xl">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
                Connect. Discover. Save.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section 
        ref={featuresRef}
        id="features"
        className={`w-full py-20 sm:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50 transition-all duration-700 ease-out ${
          visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className={`text-center mb-12 sm:mb-16 lg:mb-20 transition-all duration-700 ease-out ${
            visibleSections.has('features') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              What Makes Synvoy
              <span className="block bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Special
              </span>
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              A comprehensive platform that combines the best of travel planning, smart shopping, and social connectivity 
              in one beautiful, intuitive experience.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                ref={(el) => { featureRefs.current[index] = el }}
                data-feature-index={index}
                className={`group cursor-pointer transform hover:scale-105 transition-all duration-700 ease-out ${feature.bgColor} rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/50 shadow-xl hover:shadow-2xl backdrop-blur-sm ${
                  visibleFeatures.has(index)
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-10 scale-95'
                }`}
                style={{ 
                  transitionDelay: visibleFeatures.has(index) ? `${index * 150}ms` : '0ms'
                }}
              >
                <div className={`text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section 
        ref={valuesRef}
        id="values"
        className={`w-full py-20 sm:py-24 lg:py-32 bg-white transition-all duration-700 ease-out ${
          visibleSections.has('values') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className={`text-center mb-12 sm:mb-16 lg:mb-20 transition-all duration-700 ease-out ${
            visibleSections.has('values') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Our Core Values
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {values.map((value, index) => (
              <div
                key={value.title}
                ref={(el) => { valueRefs.current[index] = el }}
                data-value-index={index}
                className={`text-center group transition-all duration-700 ease-out ${
                  visibleValues.has(index)
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                }`}
                style={{ 
                  transitionDelay: visibleValues.has(index) ? `${index * 150}ms` : '0ms'
                }}
              >
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                  <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                    {value.icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    {value.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Synvoy Section */}
      <section 
        ref={teamRef}
        id="why-choose"
        className={`w-full py-20 sm:py-24 lg:py-32 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 relative overflow-hidden transition-all duration-700 ease-out ${
          visibleSections.has('why-choose') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
              Why Choose Synvoy?
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto">
              Everything you need for smart travel and shopping in one platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div
              ref={(el) => { whyChooseRefs.current[0] = el }}
              data-why-choose-index={0}
              className={`bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20 transition-all duration-700 ease-out ${
                visibleWhyChoose.has(0)
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
              style={{ 
                transitionDelay: visibleWhyChoose.has(0) ? '0ms' : '0ms'
              }}
            >
              <div className="text-4xl sm:text-5xl mb-4">🚀</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">All-in-One Platform</h3>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                No need to switch between multiple apps. Plan trips, track prices, and connect with friends all in one place.
              </p>
            </div>

            <div
              ref={(el) => { whyChooseRefs.current[1] = el }}
              data-why-choose-index={1}
              className={`bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20 transition-all duration-700 ease-out ${
                visibleWhyChoose.has(1)
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
              style={{ 
                transitionDelay: visibleWhyChoose.has(1) ? '150ms' : '0ms'
              }}
            >
              <div className="text-4xl sm:text-5xl mb-4">💎</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Save Money</h3>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Get the best deals with intelligent price monitoring. Our AI helps you find the perfect time to book and buy.
              </p>
            </div>

            <div
              ref={(el) => { whyChooseRefs.current[2] = el }}
              data-why-choose-index={2}
              className={`bg-white/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-white/20 transition-all duration-700 ease-out ${
                visibleWhyChoose.has(2)
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-10 scale-95'
              }`}
              style={{ 
                transitionDelay: visibleWhyChoose.has(2) ? '300ms' : '0ms'
              }}
            >
              <div className="text-4xl sm:text-5xl mb-4">🤝</div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">Build Connections</h3>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Connect with friends, plan trips together, and share amazing travel experiences. Travel is better together.
              </p>
            </div>
          </div>
        </div>

        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-20 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto">
            Join thousands of travelers who are already using Synvoy to plan better trips and save money. 
            Start your adventure today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            {!user ? (
              <>
                <Link
                  href="/"
                  className="px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-lg sm:text-xl rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-2"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/"
                  className="px-8 sm:px-12 py-3 sm:py-4 border-2 border-gray-300 text-gray-700 text-lg sm:text-xl rounded-2xl hover:border-blue-600 hover:text-blue-600 transition-all duration-300 font-semibold bg-white shadow-lg hover:shadow-xl"
                >
                  Learn More
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="px-8 sm:px-12 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-lg sm:text-xl rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-2"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
                <span className="text-xl sm:text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-bold">Synvoy</span>
                <p className="text-xs sm:text-sm text-gray-400">Smart Travel Platform</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm sm:text-base text-gray-400">
              <Link href="/" className="hover:text-white transition-colors duration-300">Home</Link>
              <Link href="/about" className="hover:text-white transition-colors duration-300">About</Link>
              <a href="#" className="hover:text-white transition-colors duration-300">Privacy</a>
              <a href="#" className="hover:text-white transition-colors duration-300">Terms</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-6 sm:pt-8 text-center">
            <p className="text-sm sm:text-base text-gray-400">
              &copy; 2024 Synvoy. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

