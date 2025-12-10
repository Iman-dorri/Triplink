'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import LoginModal from '@/components/auth/LoginModal'
import RegisterModal from '@/components/auth/RegisterModal'

export default function HomePage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg shadow-blue-900/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🌍</span>
              </div>
              <div>
                <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">Synvoy</span>
                <p className="text-xs text-gray-500 -mt-1">Smart Travel Platform</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Pricing</a>
              <a href="#about" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">About</a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors font-medium">Contact</a>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setShowLogin(true)}
                className="hidden sm:inline-flex px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Sign In
              </button>
              <button 
                onClick={() => setShowRegister(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Get Started Free
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center relative z-10">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8 shadow-lg">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></span>
              Join 50,000+ travelers already using Synvoy
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-8 leading-tight">
              Your Smart Travel
              <span className="block bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mt-2">
                Companion
              </span>
            </h1>
            
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed">
              Plan trips, track prices, and manage your travel shopping all in one beautiful platform. 
              Get the best deals and create unforgettable memories with AI-powered insights.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <button 
                onClick={() => setShowRegister(true)}
                className="group px-10 py-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xl rounded-2xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-2xl hover:shadow-3xl transform hover:-translate-y-2 flex items-center space-x-3"
              >
                <span>Start Planning Free</span>
                <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
              </button>
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

        {/* Enhanced Background Elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full opacity-30 blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-teal-200 to-emerald-200 rounded-full opacity-30 blur-3xl animate-pulse animation-delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl animate-pulse animation-delay-2000"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center group cursor-pointer transform hover:scale-105 transition-all duration-300"
              >
                <div className={`text-5xl mb-3 ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div className={`text-4xl font-bold ${stat.color} mb-2 group-hover:scale-110 transition-transform duration-300`}>
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
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
                className={`group cursor-pointer transform hover:scale-105 transition-all duration-500 ${feature.bgColor} rounded-3xl p-8 border border-white/50 shadow-xl hover:shadow-2xl backdrop-blur-sm`}
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
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
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
                className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 border border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
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
      <section className="py-24 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 relative overflow-hidden">
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
            <button 
              onClick={() => setShowRegister(true)}
              className="px-12 py-5 bg-white text-blue-600 text-xl rounded-2xl hover:bg-gray-50 transition-all duration-300 font-bold shadow-2xl hover:shadow-3xl transform hover:-translate-y-2"
            >
              Get Started Free
              <span className="ml-3">🚀</span>
            </button>
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
      <footer className="bg-gray-900 text-white py-20">
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
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">Contact</a></li>
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

      {/* Enhanced Modals */}
      {showLogin && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowLogin(false)} />
            
            <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-md">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Welcome Back</h3>
                    <p className="text-blue-100 mt-2">Sign in to your Synvoy account</p>
                  </div>
                  <button
                    onClick={() => setShowLogin(false)}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="px-8 py-8">
                <form className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
                      placeholder="Enter your password"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-600">Remember me</span>
                    </label>
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                      Forgot password?
                    </a>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
                    Sign In
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(false)
                        setShowRegister(true)
                      }}
                      className="font-semibold text-blue-600 hover:text-blue-500 transition-colors duration-300"
                    >
                      Sign up
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowRegister(false)} />
            
            <div className="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-md">
              <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">Join Synvoy</h3>
                    <p className="text-teal-100 mt-2">Create your account and start planning</p>
                  </div>
                  <button
                    onClick={() => setShowRegister(false)}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="px-8 py-8">
                <form className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-semibold text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        name="first_name"
                        id="first_name"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                        placeholder="First name"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-semibold text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        name="last_name"
                        id="last_name"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                        placeholder="Last name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                      placeholder="Create a password"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      name="confirm_password"
                      id="confirm_password"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-300"
                      placeholder="Confirm your password"
                      required
                    />
                  </div>

                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      required
                    />
                    <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <a href="#" className="text-teal-600 hover:text-teal-500 font-medium">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="#" className="text-teal-600 hover:text-teal-500 font-medium">
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-3 px-4 rounded-xl hover:from-teal-700 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Create Account
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setShowRegister(false)
                        setShowLogin(true)
                      }}
                      className="font-semibold text-teal-600 hover:text-teal-500 transition-colors duration-300"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modals */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false)
          setShowRegister(true)
        }}
      />
      <RegisterModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false)
          setShowLogin(true)
        }}
      />
    </div>
  )
}
