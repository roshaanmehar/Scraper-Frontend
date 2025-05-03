"use client"

import type React from "react"

import { useCallback } from "react"

export const useRipple = () => {
  const createRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget
    const circle = document.createElement("span")
    const diameter = Math.max(button.clientWidth, button.clientHeight)
    const radius = diameter / 2

    // Get button position
    const rect = button.getBoundingClientRect()

    circle.style.width = circle.style.height = `${diameter}px`
    circle.style.left = `${event.clientX - rect.left - radius}px`
    circle.style.top = `${event.clientY - rect.top - radius}px`
    circle.classList.add("ripple")

    // Remove existing ripples
    const ripple = button.getElementsByClassName("ripple")[0]
    if (ripple) {
      ripple.remove()
    }

    button.appendChild(circle)

    // Remove ripple after animation
    setTimeout(() => {
      if (circle) {
        circle.remove()
      }
    }, 600)
  }, [])

  return { createRipple }
}
