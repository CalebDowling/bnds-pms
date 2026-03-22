"use client";

import Image, { ImageProps } from "next/image";
import React from "react";

type ImageSize = "sm" | "md" | "lg" | "avatar" | "logo";

interface OptimizedImageProps
  extends Omit<ImageProps, "width" | "height" | "sizes"> {
  size?: ImageSize;
}

// Predefined sizes for common pharmacy image use cases
const SIZE_CONFIGS: Record<
  ImageSize,
  {
    width: number;
    height: number;
    sizes: string;
  }
> = {
  avatar: {
    width: 48,
    height: 48,
    sizes: "(max-width: 640px) 40px, 48px",
  },
  logo: {
    width: 120,
    height: 120,
    sizes: "(max-width: 640px) 100px, (max-width: 1024px) 120px, 140px",
  },
  sm: {
    width: 240,
    height: 240,
    sizes: "(max-width: 640px) 100%, (max-width: 1024px) 50%, 240px",
  },
  md: {
    width: 400,
    height: 300,
    sizes: "(max-width: 640px) 100%, (max-width: 1024px) 60%, 400px",
  },
  lg: {
    width: 800,
    height: 600,
    sizes: "(max-width: 640px) 100%, (max-width: 1024px) 80%, 800px",
  },
};

/**
 * OptimizedImage component wrapping Next.js Image with pharmacy-specific defaults.
 *
 * Features:
 * - Auto-sized based on predefined pharmacy image sizes
 * - Lazy loading by default
 * - Blur placeholder for better UX
 * - Responsive sizes attribute
 *
 * @example
 * <OptimizedImage
 *   src="/pharmacy-logo.png"
 *   alt="Pharmacy Logo"
 *   size="logo"
 * />
 */
export function OptimizedImage({
  src,
  alt,
  size = "md",
  placeholder = "blur",
  blurDataURL,
  priority = false,
  ...rest
}: OptimizedImageProps) {
  const config = SIZE_CONFIGS[size];

  // Provide a generic blur placeholder if none specified
  const blurPlaceholder =
    blurDataURL ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23f0f0f0' width='400' height='300'/%3E%3C/svg%3E";

  return (
    <Image
      src={src}
      alt={alt}
      width={config.width}
      height={config.height}
      sizes={config.sizes}
      placeholder={priority ? undefined : placeholder}
      blurDataURL={priority ? undefined : blurPlaceholder}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      {...rest}
    />
  );
}

export default OptimizedImage;
