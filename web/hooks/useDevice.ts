import { useState, useEffect } from "react"

const breakpoints = {
  isMobile: "(max-width: 767px)",
  isTablet: "(min-width: 768px) and (max-width: 1023px)",
  isDesktop: "(min-width: 1024px) and (max-width: 1439px)",
  isLargeDesktop: "(min-width: 1440px)",
}

const useDevice = () => {
  const [device, setDevice] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
  })

  useEffect(() => {
    // Create media query lists
    const mqls = {
      isMobile: window.matchMedia(breakpoints.isMobile),
      isTablet: window.matchMedia(breakpoints.isTablet),
      isDesktop: window.matchMedia(breakpoints.isDesktop),
      isLargeDesktop: window.matchMedia(breakpoints.isLargeDesktop),
    }

    const updateDevice = () => {
      setDevice({
        isMobile: mqls.isMobile.matches,
        isTablet: mqls.isTablet.matches,
        isDesktop: mqls.isDesktop.matches,
        isLargeDesktop: mqls.isLargeDesktop.matches,
      })
    }

    // Initial check
    updateDevice()

    // Listen for changes across all queries
    Object.values(mqls).forEach((mql) => {
      mql.addEventListener("change", updateDevice)
    })

    // Clean up listeners on unmount
    return () => {
      Object.values(mqls).forEach((mql) => {
        mql.removeEventListener("change", updateDevice)
      })
    }
  }, [])

  return device
}

export default useDevice
