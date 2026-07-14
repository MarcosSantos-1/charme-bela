'use client'

import Image from 'next/image'
import { User } from 'lucide-react'

interface AvatarProps {
  name?: string
  photoURL?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, photoURL, size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl'
  }

  const getInitials = (fullName?: string) => {
    if (!fullName) return '?'
    
    const names = fullName.trim().split(' ')
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase()
    }
    
    const firstName = names[0]
    const lastName = names[names.length - 1]
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getColorFromName = (fullName?: string) => {
    if (!fullName) return 'bg-gray-400'
    
    const colors = [
      'bg-pink-500',
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-teal-500'
    ]
    
    const charCode = fullName.charCodeAt(0) + fullName.charCodeAt(fullName.length - 1)
    return colors[charCode % colors.length]
  }

  if (photoURL) {
    return (
      <div className={`${sizeClasses[size]} ${className} relative rounded-full overflow-hidden`}>
        <Image
          src={photoURL}
          alt={name || 'Avatar'}
          fill
          className="object-cover"
        />
      </div>
    )
  }

  if (name) {
    return (
      <div 
        className={`${sizeClasses[size]} ${className} ${getColorFromName(name)} rounded-full flex items-center justify-center text-white font-bold`}
      >
        {getInitials(name)}
      </div>
    )
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-8 h-8' : 'w-12 h-12'

  return (
    <div className={`${sizeClasses[size]} ${className} bg-gray-300 rounded-full flex items-center justify-center`}>
      <User className={`${iconSize} text-gray-600`} />
    </div>
  )
}

