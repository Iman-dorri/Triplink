'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: React.ReactNode
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const [displayChildren, setDisplayChildren] = useState(children)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [prevPathname, setPrevPathname] = useState(pathname)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  useEffect(() => {
    // Only trigger transition if pathname actually changed
    if (pathname !== prevPathname) {
      // Determine direction based on pathname order
      const paths = ['/', '/about', '/signin', '/register']
      const currentIndex = paths.indexOf(pathname)
      const prevIndex = paths.indexOf(prevPathname)
      setDirection(currentIndex > prevIndex ? 'forward' : 'backward')
      
      // Check if navigating to signin or register pages
      const isFormPage = pathname === '/signin' || pathname === '/register'
      
      // Start fade out transition
      setIsTransitioning(true)
      
      // After fade out, update content and fade in
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setPrevPathname(pathname)
        // Add delay for form pages, small delay for others
        const fadeInDelay = isFormPage ? 200 : 10
        requestAnimationFrame(() => {
          setTimeout(() => {
            setIsTransitioning(false)
          }, fadeInDelay)
        })
      }, 350) // Half of transition duration

      return () => clearTimeout(timer)
    } else {
      // Update children without transition if pathname hasn't changed
      setDisplayChildren(children)
    }
  }, [pathname, children, prevPathname])

  // Dynamic transition with multiple effects - same quality for both directions
  const getTransform = () => {
    if (!isTransitioning) return 'translateY(0) scale(1) rotateY(0deg)'
    
    if (direction === 'forward') {
      // Going forward: slide down, scale down, slight rotation (same as backward but opposite)
      return 'translateY(30px) scale(0.96) rotateY(2deg)'
    } else {
      // Going backward: slide up, scale down, slight rotation opposite
      return 'translateY(-30px) scale(0.96) rotateY(-2deg)'
    }
  }

  // Get filter effects - same quality for both directions
  const getFilter = () => {
    if (!isTransitioning) return 'blur(0px) brightness(1)'
    
    // Same effects for both directions
    return 'blur(8px) brightness(0.9)'
  }

  return (
    <div
      className={`min-h-screen transition-all duration-700 ease-out ${
        isTransitioning 
          ? 'opacity-0' 
          : 'opacity-100'
      }`}
      style={{
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1), filter 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: getTransform(),
        filter: getFilter(),
        willChange: isTransitioning ? 'opacity, transform, filter' : 'auto',
        transformOrigin: 'center center',
        backfaceVisibility: 'hidden',
        perspective: '1000px',
      }}
    >
      {displayChildren}
    </div>
  )
}

