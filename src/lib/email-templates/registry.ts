import type { ComponentType } from 'react'
import { template as bookingConfirmation } from './booking-confirmation'
import { template as enquiryNotification } from './enquiry-notification'
import { template as orderConfirmation } from './order-confirmation'
import { template as orderNotification } from './order-notification'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmation,
  'enquiry-notification': enquiryNotification,
  'order-confirmation': orderConfirmation,
  'order-notification': orderNotification,
}
